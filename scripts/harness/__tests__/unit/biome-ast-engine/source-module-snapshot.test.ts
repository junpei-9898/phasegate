import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { ImportEdge } from '../../../biome-ast-engine/domain/value-objects/import-edge.js';
import { LayerName, InvalidLayerNameError } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';
import { SourceModuleSnapshot } from '../../../biome-ast-engine/domain/value-objects/source-module-snapshot.js';

const createFilePath = (value = 'biome-ast-engine/domain/example.ts'): FilePath =>
  FilePath.fromWorkspaceRelative(value);

const createLayerName = (value: 'domain' | 'application' | 'infrastructure' | 'presentation') =>
  LayerName.fromString(value);

const createImportEdge = (overrides?: {
  readonly from?: FilePath;
  readonly to?: FilePath;
  readonly importKind?: 'value' | 'type' | 'dynamic';
}): ImportEdge =>
  ImportEdge.create({
    from: overrides?.from ?? createFilePath('biome-ast-engine/domain/a.ts'),
    to: overrides?.to ?? createFilePath('biome-ast-engine/domain/b.ts'),
    importKind: overrides?.importKind ?? 'value',
  });

const createSourceModuleSnapshot = (overrides?: {
  readonly filePath?: FilePath;
  readonly declaredUnit?: string | null;
  readonly declaredLayer?: LayerName | null;
  readonly imports?: readonly ImportEdge[];
  readonly anyTypeCount?: number;
  readonly typedNodeCount?: number;
  readonly commentLineCount?: number;
  readonly logicalLineCount?: number;
  readonly repeatedCommentBlocks?: number;
  readonly duplicationFingerprints?: readonly string[];
  readonly exportedSymbols?: readonly string[];
  readonly isEntrypointCandidate?: boolean;
}): SourceModuleSnapshot =>
  SourceModuleSnapshot.create({
    filePath: overrides?.filePath ?? createFilePath(),
    declaredUnit: overrides && 'declaredUnit' in overrides ? overrides.declaredUnit ?? null : 'biome-ast-engine',
    declaredLayer:
      overrides && 'declaredLayer' in overrides
        ? overrides.declaredLayer ?? null
        : createLayerName('domain'),
    imports: overrides?.imports ?? [createImportEdge()],
    anyTypeCount: overrides?.anyTypeCount ?? 1,
    typedNodeCount: overrides?.typedNodeCount ?? 10,
    commentLineCount: overrides?.commentLineCount ?? 2,
    logicalLineCount: overrides?.logicalLineCount ?? 8,
    repeatedCommentBlocks: overrides?.repeatedCommentBlocks ?? 0,
    duplicationFingerprints: overrides?.duplicationFingerprints ?? Object.freeze(['fp-a']),
    exportedSymbols: overrides?.exportedSymbols ?? Object.freeze(['symbolA']),
    isEntrypointCandidate: overrides?.isEntrypointCandidate ?? false,
  });

target('SourceModuleSnapshot.create', () => {
  describe('スナップショットを生成する', () => {

    context('anyTypeCountが負数の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          filePath: createFilePath(),
          declaredUnit: 'biome-ast-engine',
          declaredLayer: createLayerName('domain'),
          imports: [createImportEdge()],
          anyTypeCount: -1,
          typedNodeCount: 10,
          commentLineCount: 2,
          logicalLineCount: 8,
          repeatedCommentBlocks: 0,
          duplicationFingerprints: Object.freeze(['fp-a']),
          exportedSymbols: Object.freeze(['symbolA']),
          isEntrypointCandidate: false,
        } as const;

        // Act
        const actual = () => SourceModuleSnapshot.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('typedNodeCountが負数の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createSourceModuleSnapshot(),
          typedNodeCount: -1,
        };

        // Act
        const actual = () => SourceModuleSnapshot.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('commentLineCountが負数の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createSourceModuleSnapshot(),
          commentLineCount: -1,
        };

        // Act
        const actual = () => SourceModuleSnapshot.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('logicalLineCountが負数の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createSourceModuleSnapshot(),
          logicalLineCount: -1,
        };

        // Act
        const actual = () => SourceModuleSnapshot.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('repeatedCommentBlocksが負数の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createSourceModuleSnapshot(),
          repeatedCommentBlocks: -1,
        };

        // Act
        const actual = () => SourceModuleSnapshot.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('declaredLayerが不正な値の場合', () => {
      it('declaredLayerがnullとして生成される（レイヤー境界チェック対象外）', () => {
        // Arrange
        const props = {
          ...createSourceModuleSnapshot(),
          declaredLayer: 'port',
        };

        // Act
        const actual = SourceModuleSnapshot.create(props);

        // Assert
        expect(actual.declaredLayer).toBeNull();
        expect(actual.hasLayerComment()).toBe(false);
      });
    });

    context('declaredLayerがnullの場合', () => {
      it('SourceModuleSnapshotが生成される', () => {
        // Arrange
        const props = {
          ...createSourceModuleSnapshot(),
          declaredLayer: null,
        };

        // Act
        const actual = SourceModuleSnapshot.create(props);

        // Assert
        expect(actual.hasLayerComment()).toBe(false);
      });
    });

    context('件数系属性がすべて0の場合', () => {
      it('SourceModuleSnapshotが生成される', () => {
        // Arrange
        const props = {
          ...createSourceModuleSnapshot(),
          anyTypeCount: 0,
          typedNodeCount: 0,
          commentLineCount: 0,
          logicalLineCount: 0,
          repeatedCommentBlocks: 0,
        };

        // Act
        const actual = SourceModuleSnapshot.create(props);

        // Assert
        expect(typeof actual.anyRatio()).toBe('number');
        expect(typeof actual.commentDensity()).toBe('number');
      });
    });
  });
});

target('SourceModuleSnapshot.hasUnitComment', () => {
  describe('@unitコメントの有無を返す', () => {
    context('declaredUnitがnullの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createSourceModuleSnapshot({ declaredUnit: null });

        // Act
        const actual = sut.hasUnitComment();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('declaredUnitが設定されている場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createSourceModuleSnapshot({ declaredUnit: 'biome-ast-engine' });

        // Act
        const actual = sut.hasUnitComment();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('SourceModuleSnapshot.hasLayerComment', () => {
  describe('@layerコメントの有無を返す', () => {
    context('declaredLayerがnullの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createSourceModuleSnapshot({ declaredLayer: null });

        // Act
        const actual = sut.hasLayerComment();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('declaredLayerが設定されている場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createSourceModuleSnapshot({ declaredLayer: createLayerName('domain') });

        // Act
        const actual = sut.hasLayerComment();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('SourceModuleSnapshot.anyRatio', () => {
  describe('any型の使用比率を返す', () => {
    context('anyTypeCount=3, typedNodeCount=10の場合', () => {
      it('0.3が返される', () => {
        // Arrange
        const sut = createSourceModuleSnapshot({ anyTypeCount: 3, typedNodeCount: 10 });

        // Act
        const actual = sut.anyRatio();

        // Assert
        expect(actual).toBe(0.3);
      });
    });
  });
});

target('SourceModuleSnapshot.commentDensity', () => {
  describe('コメント密度を返す', () => {
    context('commentLineCount=5, logicalLineCount=20の場合', () => {
      it('0.25が返される', () => {
        // Arrange
        const sut = createSourceModuleSnapshot({ commentLineCount: 5, logicalLineCount: 20 });

        // Act
        const actual = sut.commentDensity();

        // Assert
        expect(actual).toBe(0.25);
      });
    });
  });
});

target('SourceModuleSnapshot.belongsToLayerDirectory', () => {
  describe('レイヤーディレクトリへの所属を判定する', () => {
    context('filePathにdeclaredLayerと一致するセグメントがある場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createSourceModuleSnapshot({
          filePath: createFilePath('biome-ast-engine/domain/rule.ts'),
          declaredLayer: createLayerName('domain'),
        });

        // Act
        const actual = sut.belongsToLayerDirectory();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
