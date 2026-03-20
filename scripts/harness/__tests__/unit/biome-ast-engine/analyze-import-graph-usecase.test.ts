import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { SourceModuleAnalyzerPort } from '../../../biome-ast-engine/domain/ports/source-module-analyzer-port.js';
import type { WorkspaceFilePort } from '../../../biome-ast-engine/domain/ports/workspace-file-port.js';
import { ImportGraphBuilder } from '../../../biome-ast-engine/domain/services/import-graph-builder.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { ImportEdge } from '../../../biome-ast-engine/domain/value-objects/import-edge.js';
import { LayerName } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';
import { SourceModuleSnapshot } from '../../../biome-ast-engine/domain/value-objects/source-module-snapshot.js';
import { AnalyzeImportGraphUseCase } from '../../../biome-ast-engine/application/usecases/analyze-import-graph-usecase.ts';

const createFilePath = (value: string) => FilePath.fromWorkspaceRelative(value);

const createSnapshot = (
  filePath: FilePath,
  overrides: Partial<{
    declaredLayer: LayerName | null;
    imports: readonly ImportEdge[];
    isEntrypointCandidate: boolean;
  }> = {}
) =>
  SourceModuleSnapshot.create({
    filePath,
    declaredUnit: 'biome-ast-engine',
    declaredLayer: overrides.declaredLayer ?? LayerName.fromString('application'),
    imports: overrides.imports ?? [],
    anyTypeCount: 0,
    typedNodeCount: 1,
    commentLineCount: 0,
    logicalLineCount: 1,
    repeatedCommentBlocks: 0,
    duplicationFingerprints: [],
    exportedSymbols: [],
    isEntrypointCandidate: overrides.isEntrypointCandidate ?? false,
  });

const createSut = (
  files: readonly FilePath[],
  snapshots: readonly SourceModuleSnapshot[]
) => {
  const workspaceFilePort: WorkspaceFilePort = {
    listSourceFiles: vi.fn().mockResolvedValue(files),
    readText: vi.fn(),
    exists: vi.fn(),
  };
  const sourceModuleAnalyzerPort: SourceModuleAnalyzerPort = {
    analyzeMany: vi.fn().mockResolvedValue(snapshots),
  };

  return {
    workspaceFilePort,
    sourceModuleAnalyzerPort,
    sut: new AnalyzeImportGraphUseCase({
      workspaceFilePort,
      sourceModuleAnalyzerPort,
      importGraphBuilder: new ImportGraphBuilder(),
    }),
  };
};

target('AnalyzeImportGraphUseCase.execute', () => {
  describe('ソース解析結果とImportGraphを構築する', () => {
    context('targetsを指定する場合', () => {
      it('対象ファイルだけを列挙してImportGraphを返す', async () => {
        // Arrange
        const sourceFile = createFilePath('biome-ast-engine/application/usecase.ts');
        const targetFile = createFilePath('biome-ast-engine/domain/rule.ts');
        const snapshots = [
          createSnapshot(sourceFile, {
            imports: [
              ImportEdge.create({
                from: sourceFile,
                to: targetFile,
                importKind: 'value',
              }),
            ],
            isEntrypointCandidate: true,
          }),
          createSnapshot(targetFile, {
            declaredLayer: LayerName.fromString('domain'),
          }),
        ] as const;
        const { sut, workspaceFilePort, sourceModuleAnalyzerPort } = createSut(
          [sourceFile, targetFile],
          snapshots
        );
        const targets = ['biome-ast-engine/application/usecase.ts'];

        // Act
        const actual = await sut.execute({ targets });

        // Assert
        expect(workspaceFilePort.listSourceFiles).toHaveBeenCalledWith(targets);
        expect(sourceModuleAnalyzerPort.analyzeMany).toHaveBeenCalledWith([sourceFile, targetFile]);
        expect(actual.files).toEqual([sourceFile, targetFile]);
        expect(actual.importGraph.edges).toHaveLength(1);
        expect(actual.importGraph.rootNodes.map((filePath) => filePath.toString())).toEqual([
          sourceFile.toString(),
        ]);
      });
    });

    context('targetsを省略する場合', () => {
      it('全件解析して空でないsnapshotsを返す', async () => {
        // Arrange
        const filePath = createFilePath('biome-ast-engine/presentation/cli/index.ts');
        const snapshots = [
          createSnapshot(filePath, {
            declaredLayer: LayerName.fromString('presentation'),
          }),
        ] as const;
        const { sut, workspaceFilePort } = createSut([filePath], snapshots);

        // Act
        const actual = await sut.execute();

        // Assert
        expect(workspaceFilePort.listSourceFiles).toHaveBeenCalledWith(undefined);
        expect(actual.snapshots).toEqual(snapshots);
        expect(actual.importGraph.rootNodes.map((entry) => entry.toString())).toEqual([
          filePath.toString(),
        ]);
      });
    });
  });
});
