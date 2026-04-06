// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { ImportEdge } from '../../../biome-ast-engine/domain/value-objects/import-edge.js';
import { LayerName } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';
import { SourceModuleSnapshot } from '../../../biome-ast-engine/domain/value-objects/source-module-snapshot.js';
import { ImportGraphBuilder } from '../../../biome-ast-engine/domain/services/import-graph-builder.js';

const createFilePath = (value: string): FilePath => FilePath.fromWorkspaceRelative(value);
const createLayerName = (value = 'domain'): LayerName => LayerName.fromString(value);

const createImportEdge = (overrides?: {
  readonly from?: FilePath;
  readonly to?: FilePath;
  readonly importKind?: 'value' | 'type' | 'dynamic';
}): ImportEdge =>
  ImportEdge.create({
    from: overrides?.from ?? createFilePath('a.ts'),
    to: overrides?.to ?? createFilePath('b.ts'),
    importKind: overrides?.importKind ?? 'value',
  });

const createSourceModuleSnapshot = (overrides?: {
  readonly filePath?: FilePath;
  readonly imports?: readonly ImportEdge[];
  readonly isEntrypointCandidate?: boolean;
  readonly declaredLayer?: LayerName | null;
}): SourceModuleSnapshot =>
  SourceModuleSnapshot.create({
    filePath: overrides?.filePath ?? createFilePath('a.ts'),
    declaredUnit: 'biome-ast-engine',
    declaredLayer: overrides?.declaredLayer ?? createLayerName(),
    imports: overrides?.imports ?? Object.freeze([]),
    anyTypeCount: 0,
    typedNodeCount: 0,
    commentLineCount: 0,
    logicalLineCount: 0,
    repeatedCommentBlocks: 0,
    duplicationFingerprints: Object.freeze([]),
    exportedSymbols: Object.freeze([]),
    isEntrypointCandidate: overrides?.isEntrypointCandidate ?? false,
  });

target('ImportGraphBuilder.build', () => {
  describe('スナップショット群からImportGraphを構築する', () => {
    context('正常なスナップショット群の場合', () => {
      it('ノードとエッジが正しく構築される', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('a.ts'),
            imports: Object.freeze([
              createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
            ]),
          }),
          createSourceModuleSnapshot({ filePath: createFilePath('b.ts') }),
        ]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.nodes).toHaveLength(2);
        expect(actual.outgoingEdgesOf(createFilePath('a.ts'))).toHaveLength(1);
      });
    });

    context('isEntrypointCandidate=trueのファイルがある場合', () => {
      it('rootNodesに含まれる', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const entryFile = createFilePath('entry.ts');
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ filePath: entryFile, isEntrypointCandidate: true }),
        ]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.rootNodes.map((node) => node.toString())).toContain(entryFile.toString());
      });
    });

    context('index.tsファイルがある場合', () => {
      it('rootNodesに既定で含まれる', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const indexFile = createFilePath('biome-ast-engine/domain/index.ts');
        const snapshots = Object.freeze([createSourceModuleSnapshot({ filePath: indexFile })]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.rootNodes.map((node) => node.toString())).toContain(indexFile.toString());
      });
    });

    context('presentation/cli配下のファイルがある場合', () => {
      it('rootNodesに既定で含まれる', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const cliFile = createFilePath('biome-ast-engine/presentation/cli/main.ts');
        const snapshots = Object.freeze([createSourceModuleSnapshot({ filePath: cliFile })]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.rootNodes.map((node) => node.toString())).toContain(cliFile.toString());
      });
    });

    context('重複importがある場合', () => {
      it('エッジが重複除去される', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const edge = createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') });
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('a.ts'),
            imports: Object.freeze([edge, edge]),
          }),
          createSourceModuleSnapshot({ filePath: createFilePath('b.ts') }),
        ]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.outgoingEdgesOf(createFilePath('a.ts'))).toHaveLength(1);
      });
    });

    context('空のスナップショット配列の場合', () => {
      it('空のImportGraphが返される', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const snapshots = Object.freeze([] as SourceModuleSnapshot[]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.nodes).toEqual([]);
        expect(actual.edges).toEqual([]);
        expect(actual.rootNodes).toEqual([]);
      });
    });

    context('複数ファイルが相互参照している場合', () => {
      it('双方向のエッジが構築される', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('a.ts'),
            imports: Object.freeze([
              createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
            ]),
          }),
          createSourceModuleSnapshot({
            filePath: createFilePath('b.ts'),
            imports: Object.freeze([
              createImportEdge({ from: createFilePath('b.ts'), to: createFilePath('a.ts') }),
            ]),
          }),
        ]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.outgoingEdgesOf(createFilePath('a.ts'))).toHaveLength(1);
        expect(actual.outgoingEdgesOf(createFilePath('b.ts'))).toHaveLength(1);
      });
    });

    context('type-only importのみの場合', () => {
      it('importKind="type"のエッジが構築される', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('a.ts'),
            imports: Object.freeze([
              createImportEdge({
                from: createFilePath('a.ts'),
                to: createFilePath('b.ts'),
                importKind: 'type',
              }),
            ]),
          }),
          createSourceModuleSnapshot({ filePath: createFilePath('b.ts') }),
        ]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.outgoingEdgesOf(createFilePath('a.ts'))[0]?.importKind).toBe('type');
      });
    });

    context('importsが空のスナップショットの場合', () => {
      it('ノードのみが登録されエッジは空である', () => {
        // Arrange
        const sut = new ImportGraphBuilder();
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ filePath: createFilePath('a.ts'), imports: Object.freeze([]) }),
        ]);

        // Act
        const actual = sut.build(snapshots);

        // Assert
        expect(actual.nodes).toHaveLength(1);
        expect(actual.edges).toHaveLength(0);
      });
    });

  });
});
