# ユニットテストロジック設計: traceability-model

@story-id H03-01
@story-id H03-02
@story-id H03-03
## 1. テストファイル構成
| ファイルパス | 対象モデル | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/traceability-model/story-id.test.ts` | StoryId | 8 |
| `scripts/harness/__tests__/unit/traceability-model/project-relative-path.test.ts` | ProjectRelativePath | 12 |
| `scripts/harness/__tests__/unit/traceability-model/metadata-tag.test.ts` | MetadataTag | 10 |
| `scripts/harness/__tests__/unit/traceability-model/unit-reference.test.ts` | UnitReference | 5 |
| `scripts/harness/__tests__/unit/traceability-model/layer-reference.test.ts` | LayerReference | 6 |
| `scripts/harness/__tests__/unit/traceability-model/story-reference.test.ts` | StoryReference | 4 |
| `scripts/harness/__tests__/unit/traceability-model/story-id-annotation.test.ts` | StoryIdAnnotation | 5 |
| `scripts/harness/__tests__/unit/traceability-model/design-document-flags.test.ts` | DesignDocumentFlags | 6 |
| `scripts/harness/__tests__/unit/traceability-model/chain-link.test.ts` | ChainLink | 5 |
| `scripts/harness/__tests__/unit/traceability-model/traceability-chain.test.ts` | TraceabilityChain | 9 |
| `scripts/harness/__tests__/unit/traceability-model/metadata-validation-result.test.ts` | MetadataValidationResult | 9 |
| `scripts/harness/__tests__/unit/traceability-model/metadata-validator.test.ts` | MetadataValidator | 22 |
| `scripts/harness/__tests__/unit/traceability-model/story-id-alias-resolver.test.ts` | StoryIdAliasResolver | 6 |
| `scripts/harness/__tests__/unit/traceability-model/traceability-chain-builder.test.ts` | TraceabilityChainBuilder | 8 |

## 2. 共通ヘルパー・ファクトリ

```ts
import { describe, expect, it, vi } from 'vitest';
import { context, target } from '../../helper/common-helper';

const createHarnessError = (overrides = {}) => ({
  code: 'L2-002',
  message: 'metadata validation failed',
  fixExample: '@story-id H03-01',
  ...overrides,
});

const createStoryId = (value = 'H03-01') => StoryId.parse(value);
const createProjectRelativePath = (
  value = 'docs/product/construction/traceability-model/domain_model.md',
) => ProjectRelativePath.create(value);

const createMetadataTag = (overrides = {}) =>
  MetadataTag.create({
    type: '@unit',
    value: 'traceability-model',
    lineNumber: 1,
    ...overrides,
  });

const createUnitReferenceResolved = (overrides = {}) =>
  UnitReference.resolved({
    unitName: 'traceability-model',
    constructionRoot: createProjectRelativePath('docs/product/construction/traceability-model'),
    ...overrides,
  });

const createUnitReferenceUnresolved = (unitName = 'unknown-unit') =>
  UnitReference.unresolved({ unitName });

const createLayerReference = (layerName = 'domain') => LayerReference.parse(layerName);

const createStoryReferenceResolved = (value = 'H03-01') =>
  StoryReference.resolved({ storyId: StoryId.parse(value) });

const createStoryReferenceUnresolved = (value = 'H03-01') =>
  StoryReference.unresolved({ storyId: StoryId.parse(value) });

const createStoryIdAnnotation = (overrides = {}) =>
  StoryIdAnnotation.create({
    storyId: createStoryId(),
    lineNumber: 8,
    contextLine: '## StoryIdを検証する',
    standaloneLine: true,
    ...overrides,
  });

const createDesignDocumentFlags = (initialCreation = false) =>
  DesignDocumentFlags.create({ initialCreation });

const createChainLink = (overrides = {}) =>
  ChainLink.create({
    from: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
    to: createProjectRelativePath('docs/product/construction/traceability-model'),
    linkType: 'implementation-to-unit',
    resolved: true,
    ...overrides,
  });

const createTraceabilityChain = (overrides = {}) =>
  TraceabilityChain.create({
    origin: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
    links: [
      createChainLink({
        from: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
        to: createProjectRelativePath('docs/product/construction/traceability-model'),
        linkType: 'implementation-to-unit',
      }),
      createChainLink({
        from: createProjectRelativePath('docs/product/construction/traceability-model'),
        to: createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
        linkType: 'unit-to-design',
      }),
      createChainLink({
        from: createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
        to: createProjectRelativePath('docs/product/user_stories.md'),
        linkType: 'design-to-story',
      }),
      createChainLink({
        from: createProjectRelativePath('docs/product/user_stories.md'),
        to: createProjectRelativePath('inception/traceability-model/H03-01/unit_test_logic_plan.md'),
        linkType: 'story-to-plan',
      }),
    ],
    ...overrides,
  });

const createMetadataValidationResultSuccess = (warnings = []) =>
  MetadataValidationResult.success({ warnings });

const createMetadataValidationResultFailure = (errors, warnings = []) =>
  MetadataValidationResult.failure({ errors, warnings });

const createMetadataValidatorSut = () => {
  const storyCatalogPort = {
    hasStoryId: vi.fn().mockResolvedValue(true),
  };
  const unitDefinitionPort = {
    hasUnit: vi.fn().mockResolvedValue(true),
  };

  return {
    sut: new MetadataValidator({ storyCatalogPort, unitDefinitionPort }),
    storyCatalogPort,
    unitDefinitionPort,
  };
};

const createStoryIdAliasResolverSut = (aliases = {}) => {
  const storyCatalogPort = {
    getLegacyStoryIdAliases: vi.fn().mockResolvedValue(aliases),
  };

  return {
    sut: new StoryIdAliasResolver({ storyCatalogPort }),
    storyCatalogPort,
  };
};

const createTraceabilityChainBuilderSut = () => {
  const metadataReaderPort = {
    readImplementationTags: vi.fn(),
  };
  const unitDefinitionPort = {
    resolveConstructionRoot: vi.fn(),
  };
  const designDocumentPort = {
    findConstructionDocuments: vi.fn(),
    readStoryIdAnnotations: vi.fn(),
  };
  const storyCatalogPort = {
    hasStoryId: vi.fn().mockResolvedValue(true),
  };
  const inceptionPlanPort = {
    findPlanByStoryId: vi.fn(),
  };

  return {
    sut: new TraceabilityChainBuilder({
      metadataReaderPort,
      unitDefinitionPort,
      designDocumentPort,
      storyCatalogPort,
      inceptionPlanPort,
    }),
    metadataReaderPort,
    unitDefinitionPort,
    designDocumentPort,
    storyCatalogPort,
    inceptionPlanPort,
  };
};
```

## 3. テストケース詳細ロジック

### 3.1 `story-id.test.ts`

```ts
target('StoryId.parse', () => {
  describe('HXX-XX形式の文字列からStoryIdを生成する', () => {
    // UT-TM-001
    context('正規形式の文字列を渡す場合', () => {
      it('StoryIdが生成できること', () => {
        // Arrange
        const input = 'H03-01';

        // Act
        const actual = StoryId.parse(input);

        // Assert
        expect(actual.value).toBe('H03-01');
      });
    });

    // UT-TM-002
    context('前後に空白がある場合', () => {
      it('trimされた値でStoryIdが生成できること', () => {
        // Arrange
        const input = '  H03-01  ';

        // Act
        const actual = StoryId.parse(input);

        // Assert
        expect(actual.value).toBe('H03-01');
      });
    });

    // UT-TM-003
    context('HXX-XX形式でない文字列を渡す場合', () => {
      it('形式エラーが発生すること', () => {
        // Arrange
        const actual = () => StoryId.parse('HX-1');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(StoryIdFormatError);
      });
    });

    // UT-TM-004
    context('US-XXX形式の文字列を渡す場合', () => {
      it('形式エラーが発生すること', () => {
        // Arrange
        const actual = () => StoryId.parse('US-123');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(StoryIdFormatError);
      });
    });

    // UT-TM-005
    context('空文字を渡す場合', () => {
      it('形式エラーが発生すること', () => {
        // Arrange
        const actual = () => StoryId.parse('');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(StoryIdFormatError);
      });
    });
  });
});

target('StoryId.getEpicNumber', () => {
  describe('StoryIdからエピック番号を取得する', () => {
    // UT-TM-006
    context('正規のStoryIdを保持している場合', () => {
      it('正しいエピック番号を返すこと', () => {
        // Arrange
        const sut = StoryId.parse('H12-34');

        // Act
        const actual = sut.getEpicNumber();

        // Assert
        expect(actual).toBe('12');
      });
    });
  });
});

target('StoryId.getStoryNumber', () => {
  describe('StoryIdからストーリー番号を取得する', () => {
    // UT-TM-007
    context('正規のStoryIdを保持している場合', () => {
      it('正しいストーリー番号を返すこと', () => {
        // Arrange
        const sut = StoryId.parse('H12-34');

        // Act
        const actual = sut.getStoryNumber();

        // Assert
        expect(actual).toBe('34');
      });
    });
  });
});

target('StoryId.equals', () => {
  describe('2つのStoryIdの等価性を判定する', () => {
    // UT-TM-008
    context('同一値のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = StoryId.parse('H03-01');
        const other = StoryId.parse('H03-01');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.2 `project-relative-path.test.ts`

```ts
target('ProjectRelativePath.create', () => {
  describe('プロジェクト相対パスを生成する', () => {
    // UT-TM-009
    context('docs配下の正規パスを渡す場合', () => {
      it('docs配下のProjectRelativePathが生成できること', () => {
        // Arrange
        const input = 'docs/product/construction/traceability-model/domain_model.md';

        // Act
        const actual = ProjectRelativePath.create(input);

        // Assert
        expect(actual.value).toBe(input);
      });
    });

    // UT-TM-010
    context('scripts配下のパスを渡す場合', () => {
      it('scripts配下のProjectRelativePathが生成できること', () => {
        // Arrange
        const input = 'scripts/harness/domain/story-id.ts';

        // Act
        const actual = ProjectRelativePath.create(input);

        // Assert
        expect(actual.value).toBe(input);
      });
    });

    // UT-TM-011
    context('空文字を渡す場合', () => {
      it('パスエラーが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });

    // UT-TM-012
    context('絶対パスを渡す場合', () => {
      it('パスエラーが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('/tmp/file.ts');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });

    // UT-TM-013
    context('..によるルート脱出パスを渡す場合', () => {
      it('パスエラーが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('../outside/file.ts');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });

    // UT-TM-014
    context('バックスラッシュを含むパスを渡す場合', () => {
      it('パスエラーが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('docs\\product\\x.md');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });

    // UT-TM-015
    context('docsとscripts以外のパスを渡す場合', () => {
      it('パスエラーが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('package.json');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });
  });
});

target('ProjectRelativePath.join', () => {
  describe('パスセグメントを結合する', () => {
    // UT-TM-016
    context('正規パスと子セグメントを結合する場合', () => {
      it('結合後のProjectRelativePathを返すこと', () => {
        // Arrange
        const sut = ProjectRelativePath.create('docs/product/construction');

        // Act
        const actual = sut.join('traceability-model', 'domain_model.md');

        // Assert
        expect(actual.value).toBe('docs/product/construction/traceability-model/domain_model.md');
      });
    });
  });
});

target('ProjectRelativePath.dirname', () => {
  describe('親ディレクトリパスを取得する', () => {
    // UT-TM-017
    context('ファイルパスを保持している場合', () => {
      it('親ディレクトリのProjectRelativePathを返すこと', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.dirname();

        // Assert
        expect(actual.value).toBe('docs/product/construction/traceability-model');
      });
    });
  });
});

target('ProjectRelativePath.basename', () => {
  describe('ファイル名を取得する', () => {
    // UT-TM-018
    context('ファイルパスを保持している場合', () => {
      it('正しいファイル名を返すこと', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.basename();

        // Assert
        expect(actual).toBe('domain_model.md');
      });
    });
  });
});

target('ProjectRelativePath.extname', () => {
  describe('拡張子を取得する', () => {
    // UT-TM-019
    context('拡張子を持つパスの場合', () => {
      it('正しい拡張子を返すこと', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.extname();

        // Assert
        expect(actual).toBe('.md');
      });
    });
  });
});

target('ProjectRelativePath.startsWith', () => {
  describe('パスの前方一致を判定する', () => {
    // UT-TM-020
    context('指定プレフィックスと比較する場合', () => {
      it('前方一致を正しく判定すること', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.startsWith('docs/product');

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.3 `metadata-tag.test.ts`

```ts
target('MetadataTag.create', () => {
  describe('メタデータタグを生成する', () => {
    // UT-TM-021
    context('typeが@unitの場合', () => {
      it('@unitタグが生成できること', () => {
        // Arrange
        const input = { type: '@unit', value: 'traceability-model', lineNumber: 1 };

        // Act
        const actual = MetadataTag.create(input);

        // Assert
        expect(actual.type).toBe('@unit');
        expect(actual.value).toBe('traceability-model');
      });
    });

    // UT-TM-022
    context('typeが@layerの場合', () => {
      it('@layerタグが生成できること', () => {
        // Arrange
        const input = { type: '@layer', value: 'domain', lineNumber: 2 };

        // Act
        const actual = MetadataTag.create(input);

        // Assert
        expect(actual.type).toBe('@layer');
        expect(actual.value).toBe('domain');
      });
    });

    // UT-TM-023
    context('typeが@story-idの場合', () => {
      it('@story-idタグが生成できること', () => {
        // Arrange
        const input = { type: '@story-id', value: 'H03-01', lineNumber: 3 };

        // Act
        const actual = MetadataTag.create(input);

        // Assert
        expect(actual.type).toBe('@story-id');
        expect(actual.value).toBe('H03-01');
      });
    });

    // UT-TM-024
    context('typeが@storyの場合', () => {
      it('@storyタグが生成できること', () => {
        // Arrange
        const input = { type: '@story', value: 'H03-03', lineNumber: 4 };

        // Act
        const actual = MetadataTag.create(input);

        // Assert
        expect(actual.type).toBe('@story');
        expect(actual.value).toBe('H03-03');
      });
    });

    // UT-TM-025
    context('正規4種以外のtypeを渡す場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          MetadataTag.create({ type: '@owner', value: 'traceability-model', lineNumber: 1 });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });

    // UT-TM-026
    context('valueが空文字の場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () => MetadataTag.create({ type: '@unit', value: '', lineNumber: 1 });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });

    // UT-TM-027
    context('lineNumberが0の場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          MetadataTag.create({ type: '@unit', value: 'traceability-model', lineNumber: 0 });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });
  });
});

target('MetadataTag.isUnitTag', () => {
  describe('タグ種別を判定する', () => {
    // UT-TM-028
    context('@unitタグとそれ以外を比較する場合', () => {
      it('@unitタグのみtrueを返すこと', () => {
        // Arrange
        const sut = createMetadataTag({ type: '@unit' });
        const other = createMetadataTag({ type: '@layer', value: 'domain' });

        // Act
        const actual = [sut.isUnitTag(), other.isUnitTag()];

        // Assert
        expect(actual).toEqual([true, false]);
      });
    });
  });
});

target('MetadataTag.isLayerTag', () => {
  describe('タグ種別を判定する', () => {
    // UT-TM-029
    context('@layerタグとそれ以外を比較する場合', () => {
      it('@layerタグのみtrueを返すこと', () => {
        // Arrange
        const sut = createMetadataTag({ type: '@layer', value: 'domain' });
        const other = createMetadataTag({ type: '@story', value: 'H03-01' });

        // Act
        const actual = [sut.isLayerTag(), other.isLayerTag()];

        // Assert
        expect(actual).toEqual([true, false]);
      });
    });
  });
});

target('MetadataTag.equals', () => {
  describe('2つのMetadataTagの等価性を判定する', () => {
    // UT-TM-030
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataTag({ type: '@story-id', value: 'H03-01', lineNumber: 9 });
        const other = createMetadataTag({ type: '@story-id', value: 'H03-01', lineNumber: 9 });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.4 `unit-reference.test.ts`

```ts
target('UnitReference.resolved', () => {
  describe('Unit定義と照合済みの参照を生成する', () => {
    // UT-TM-031
    context('存在するUnit名とconstructionRootを指定する場合', () => {
      it('resolved=trueかつconstructionRootが設定されたインスタンスを返すこと', () => {
        // Arrange
        const input = {
          unitName: 'traceability-model',
          constructionRoot: createProjectRelativePath('docs/product/construction/traceability-model'),
        };

        // Act
        const actual = UnitReference.resolved(input);

        // Assert
        expect(actual.unitName).toBe('traceability-model');
        expect(actual.resolved).toBe(true);
        expect(actual.constructionRoot?.value).toBe('docs/product/construction/traceability-model');
      });
    });
  });
});

target('UnitReference.unresolved', () => {
  describe('未照合のUnit参照を生成する', () => {
    // UT-TM-032
    context('未知のUnit名を指定する場合', () => {
      it('resolved=falseかつconstructionRoot=nullのインスタンスを返すこと', () => {
        // Arrange
        const input = { unitName: 'unknown-unit' };

        // Act
        const actual = UnitReference.unresolved(input);

        // Assert
        expect(actual.unitName).toBe('unknown-unit');
        expect(actual.resolved).toBe(false);
        expect(actual.constructionRoot).toBeNull();
      });
    });
  });
});

target('UnitReference.isResolved', () => {
  describe('照合状態を判定する', () => {
    // UT-TM-033
    context('resolved=trueの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createUnitReferenceResolved();

        // Act
        const actual = sut.isResolved();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-034
    context('resolved=falseの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createUnitReferenceUnresolved();

        // Act
        const actual = sut.isResolved();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('UnitReference.equals', () => {
  describe('2つのUnitReferenceの等価性を判定する', () => {
    // UT-TM-035
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createUnitReferenceResolved();
        const other = createUnitReferenceResolved();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.5 `layer-reference.test.ts`

```ts
target('LayerReference.parse', () => {
  describe('レイヤー名からLayerReferenceを生成する', () => {
    // UT-TM-036
    context('正規語彙domainを渡す場合', () => {
      it('valid=trueのLayerReferenceを返すこと', () => {
        // Arrange
        const input = 'domain';

        // Act
        const actual = LayerReference.parse(input);

        // Assert
        expect(actual.layerName).toBe('domain');
        expect(actual.valid).toBe(true);
      });
    });

    // UT-TM-037
    context('正規語彙applicationとinfrastructureとpresentationを渡す場合', () => {
      it('いずれもvalid=trueのLayerReferenceを返すこと', () => {
        // Arrange
        const inputs = ['application', 'infrastructure', 'presentation'];

        // Act
        const actual = inputs.map((input) => LayerReference.parse(input));

        // Assert
        expect(actual.map((item) => item.valid)).toEqual([true, true, true]);
      });
    });

    // UT-TM-038
    context('legacy語彙usecaseを渡す場合', () => {
      it('valid=falseのLayerReferenceを返すこと', () => {
        // Arrange
        const input = 'usecase';

        // Act
        const actual = LayerReference.parse(input);

        // Assert
        expect(actual.layerName).toBe('usecase');
        expect(actual.valid).toBe(false);
      });
    });

    // UT-TM-039
    context('legacy語彙portとcontrollerを渡す場合', () => {
      it('いずれもvalid=falseのLayerReferenceを返すこと', () => {
        // Arrange
        const inputs = ['port', 'controller'];

        // Act
        const actual = inputs.map((input) => LayerReference.parse(input));

        // Assert
        expect(actual.map((item) => item.valid)).toEqual([false, false]);
      });
    });

    // UT-TM-040
    context('正規語彙にもlegacy語彙にも属さない値を渡す場合', () => {
      it('valid=falseのLayerReferenceを返すこと', () => {
        // Arrange
        const input = 'adapter';

        // Act
        const actual = LayerReference.parse(input);

        // Assert
        expect(actual.layerName).toBe('adapter');
        expect(actual.valid).toBe(false);
      });
    });
  });
});

target('LayerReference.equals', () => {
  describe('2つのLayerReferenceの等価性を判定する', () => {
    // UT-TM-041
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createLayerReference('domain');
        const other = createLayerReference('domain');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.6 `story-reference.test.ts`

```ts
target('StoryReference.resolved', () => {
  describe('照合済みのStoryReferenceを生成する', () => {
    // UT-TM-042
    context('catalogに存在するStoryIdを指定する場合', () => {
      it('resolved=trueかつparse済みStoryIdが設定されたインスタンスを返すこと', () => {
        // Arrange
        const input = { storyId: StoryId.parse('H03-01') };

        // Act
        const actual = StoryReference.resolved(input);

        // Assert
        expect(actual.storyId.value).toBe('H03-01');
        expect(actual.resolved).toBe(true);
      });
    });
  });
});

target('StoryReference.unresolved', () => {
  describe('未照合のStoryReferenceを生成する', () => {
    // UT-TM-043
    context('catalogに存在しないStoryIdを指定する場合', () => {
      it('resolved=falseかつparse済みStoryIdが設定されたインスタンスを返すこと', () => {
        // Arrange
        const input = { storyId: StoryId.parse('H03-99') };

        // Act
        const actual = StoryReference.unresolved(input);

        // Assert
        expect(actual.storyId.value).toBe('H03-99');
        expect(actual.resolved).toBe(false);
      });
    });
  });
});

target('StoryReference.isResolved', () => {
  describe('照合状態を判定する', () => {
    // UT-TM-044
    context('resolved属性を持つインスタンスを判定する場合', () => {
      it('resolved属性に応じた真偽値を返すこと', () => {
        // Arrange
        const resolvedReference = createStoryReferenceResolved('H03-01');
        const unresolvedReference = createStoryReferenceUnresolved('H03-99');

        // Act
        const actual = [resolvedReference.isResolved(), unresolvedReference.isResolved()];

        // Assert
        expect(actual).toEqual([true, false]);
      });
    });
  });
});

target('StoryReference.equals', () => {
  describe('2つのStoryReferenceの等価性を判定する', () => {
    // UT-TM-045
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createStoryReferenceResolved('H03-01');
        const other = createStoryReferenceResolved('H03-01');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.7 `story-id-annotation.test.ts`

```ts
target('StoryIdAnnotation.create', () => {
  describe('設計文書のstory-idアノテーションを生成する', () => {
    // UT-TM-046
    context('正しい引数を渡す場合', () => {
      it('storyIdとlineNumberとcontextLineとstandaloneLineが正しく設定されること', () => {
        // Arrange
        const input = {
          storyId: StoryId.parse('H03-01'),
          lineNumber: 12,
          contextLine: '## StoryId',
          standaloneLine: true,
        };

        // Act
        const actual = StoryIdAnnotation.create(input);

        // Assert
        expect(actual.storyId.value).toBe('H03-01');
        expect(actual.lineNumber).toBe(12);
        expect(actual.contextLine).toBe('## StoryId');
        expect(actual.standaloneLine).toBe(true);
      });
    });

    // UT-TM-047
    context('lineNumberが0以下の場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          StoryIdAnnotation.create({
            storyId: StoryId.parse('H03-01'),
            lineNumber: 0,
            contextLine: '## StoryId',
            standaloneLine: true,
          });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });
  });
});

target('StoryIdAnnotation.isStandalone', () => {
  describe('独立行判定を行う', () => {
    // UT-TM-048
    context('standaloneLine=trueの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createStoryIdAnnotation({ standaloneLine: true });

        // Act
        const actual = sut.isStandalone();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-049
    context('standaloneLine=falseの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createStoryIdAnnotation({ standaloneLine: false });

        // Act
        const actual = sut.isStandalone();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('StoryIdAnnotation.equals', () => {
  describe('2つのStoryIdAnnotationの等価性を判定する', () => {
    // UT-TM-050
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createStoryIdAnnotation();
        const other = createStoryIdAnnotation();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.8 `design-document-flags.test.ts`

```ts
target('DesignDocumentFlags.requiresStoryIdAnnotation', () => {
  describe('story-id注釈の必須判定を行う', () => {
    // UT-TM-051
    context('initialCreation=trueの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);

        // Act
        const actual = sut.requiresStoryIdAnnotation();

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-TM-052
    context('initialCreation=falseの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(false);

        // Act
        const actual = sut.requiresStoryIdAnnotation();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('DesignDocumentFlags.allowsStoryIdOmission', () => {
  describe('story-id省略許可を判定する', () => {
    // UT-TM-053
    context('initialCreation=trueの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);

        // Act
        const actual = sut.allowsStoryIdOmission();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-054
    context('initialCreation=falseの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(false);

        // Act
        const actual = sut.allowsStoryIdOmission();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('DesignDocumentFlags.equals', () => {
  describe('2つのDesignDocumentFlagsの等価性を判定する', () => {
    // UT-TM-055
    context('同一フラグ値の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);
        const other = createDesignDocumentFlags(true);

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-056
    context('異なるフラグ値の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);
        const other = createDesignDocumentFlags(false);

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

### 3.9 `chain-link.test.ts`

```ts
target('ChainLink.create', () => {
  describe('チェーンリンクを生成する', () => {
    // UT-TM-057
    context('正規linkTypeを渡す場合', () => {
      it('各正規linkTypeでChainLinkが生成できること', () => {
        // Arrange
        const inputs = [
          {
            from: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
            to: createProjectRelativePath('docs/product/construction/traceability-model'),
            linkType: 'implementation-to-unit',
            resolved: true,
          },
          {
            from: createProjectRelativePath('docs/product/construction/traceability-model'),
            to: createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
            linkType: 'unit-to-design',
            resolved: true,
          },
          {
            from: createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
            to: createProjectRelativePath('docs/product/user_stories.md'),
            linkType: 'design-to-story',
            resolved: true,
          },
          {
            from: createProjectRelativePath('docs/product/user_stories.md'),
            to: createProjectRelativePath('inception/traceability-model/H03-01/unit_test_logic_plan.md'),
            linkType: 'story-to-plan',
            resolved: true,
          },
        ];

        // Act
        const actual = inputs.map((input) => ChainLink.create(input));

        // Assert
        expect(actual.map((item) => item.linkType)).toEqual([
          'implementation-to-unit',
          'unit-to-design',
          'design-to-story',
          'story-to-plan',
        ]);
      });
    });

    // UT-TM-058
    context('正規4値以外のlinkTypeを渡す場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          ChainLink.create({
            from: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
            to: createProjectRelativePath('docs/product/construction/traceability-model'),
            linkType: 'implementation-to-document',
            resolved: true,
          });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });

    // UT-TM-059
    context('fromまたはtoが欠落している場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          ChainLink.create({
            from: null,
            to: createProjectRelativePath('docs/product/construction/traceability-model'),
            linkType: 'implementation-to-unit',
            resolved: false,
          });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });
  });
});

target('ChainLink.isBroken', () => {
  describe('リンクの欠損判定を行う', () => {
    // UT-TM-060
    context('resolved=falseの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createChainLink({ resolved: false });

        // Act
        const actual = sut.isBroken();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('ChainLink.equals', () => {
  describe('2つのChainLinkの等価性を判定する', () => {
    // UT-TM-061
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createChainLink();
        const other = createChainLink();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.10 `traceability-chain.test.ts`

```ts
target('TraceabilityChain.isComplete', () => {
  describe('チェーンの完全性を判定する', () => {
    // UT-TM-062
    context('全リンクがresolved=trueの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createTraceabilityChain();

        // Act
        const actual = sut.isComplete();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-063
    context('1件でもresolved=falseがある場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createTraceabilityChain({
          links: [
            createChainLink({
              from: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
              to: createProjectRelativePath('docs/product/construction/traceability-model'),
              linkType: 'implementation-to-unit',
            }),
            createChainLink({
              from: createProjectRelativePath('docs/product/construction/traceability-model'),
              to: createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
              linkType: 'unit-to-design',
              resolved: false,
            }),
          ],
        });

        // Act
        const actual = sut.isComplete();

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-TM-064
    context('linksが空配列の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = TraceabilityChain.create({
          origin: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          links: [],
        });

        // Act
        const actual = sut.isComplete();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('TraceabilityChain.getBrokenLinks', () => {
  describe('欠損リンクを取得する', () => {
    // UT-TM-065
    context('resolved=falseのリンクが存在する場合', () => {
      it('resolved=falseのリンクのみを返すこと', () => {
        // Arrange
        const brokenLink = createChainLink({
          from: createProjectRelativePath('docs/product/construction/traceability-model'),
          to: createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
          linkType: 'unit-to-design',
          resolved: false,
        });
        const sut = createTraceabilityChain({
          links: [createChainLink(), brokenLink],
        });

        // Act
        const actual = sut.getBrokenLinks();

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].linkType).toBe('unit-to-design');
      });
    });
  });
});

target('TraceabilityChain.getResolvedLinks', () => {
  describe('解決済みリンクを取得する', () => {
    // UT-TM-066
    context('resolved=trueのリンクが存在する場合', () => {
      it('resolved=trueのリンクのみを返すこと', () => {
        // Arrange
        const resolvedLink = createChainLink();
        const brokenLink = createChainLink({
          from: createProjectRelativePath('docs/product/construction/traceability-model'),
          to: createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
          linkType: 'unit-to-design',
          resolved: false,
        });
        const sut = createTraceabilityChain({
          links: [resolvedLink, brokenLink],
        });

        // Act
        const actual = sut.getResolvedLinks();

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].resolved).toBe(true);
      });
    });

    // UT-TM-067
    context('linksが空配列の場合', () => {
      it('空配列を返すこと', () => {
        // Arrange
        const sut = TraceabilityChain.create({
          origin: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          links: [],
        });

        // Act
        const actual = sut.getResolvedLinks();

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});

target('TraceabilityChain.create', () => {
  describe('TraceabilityChainを生成する', () => {
    // UT-TM-068
    context('originがlinks[0].fromと整合しない場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          TraceabilityChain.create({
            origin: createProjectRelativePath('scripts/harness/domain/other.ts'),
            links: [createChainLink()],
          });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });

    // UT-TM-069
    context('正規順序のlinkTypeでリンクを渡す場合', () => {
      it('implementation-to-unitからstory-to-planの順序で保持されること', () => {
        // Arrange
        const links = createTraceabilityChain().links;

        // Act
        const actual = TraceabilityChain.create({
          origin: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          links,
        });

        // Assert
        expect(actual.links.map((link) => link.linkType)).toEqual([
          'implementation-to-unit',
          'unit-to-design',
          'design-to-story',
          'story-to-plan',
        ]);
      });
    });
  });
});

target('TraceabilityChain.equals', () => {
  describe('2つのTraceabilityChainの等価性を判定する', () => {
    // UT-TM-070
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createTraceabilityChain();
        const other = createTraceabilityChain();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.11 `metadata-validation-result.test.ts`

```ts
target('MetadataValidationResult.success', () => {
  describe('成功結果を生成する', () => {
    // UT-TM-071
    context('warningsを指定しない場合', () => {
      it('valid=trueかつerrors空のインスタンスを返すこと', () => {
        // Arrange
        // Arrangeのみ

        // Act
        const actual = MetadataValidationResult.success();

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-072
    context('warningsを指定する場合', () => {
      it('valid=trueかつ指定warningsを保持すること', () => {
        // Arrange
        const warnings = [createHarnessError({ message: 'legacy metadata' })];

        // Act
        const actual = MetadataValidationResult.success({ warnings });

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.warnings).toEqual(warnings);
      });
    });
  });
});

target('MetadataValidationResult.failure', () => {
  describe('失敗結果を生成する', () => {
    // UT-TM-073
    context('warningsを指定しない場合', () => {
      it('valid=falseかつ指定errorsを保持すること', () => {
        // Arrange
        const errors = [createHarnessError({ message: 'missing @unit' })];

        // Act
        const actual = MetadataValidationResult.failure({ errors });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors).toEqual(errors);
      });
    });

    // UT-TM-074
    context('warningsも指定する場合', () => {
      it('valid=falseかつerrorsとwarningsが両方保持されること', () => {
        // Arrange
        const errors = [createHarnessError({ message: 'missing @story' })];
        const warnings = [createHarnessError({ message: 'legacy alias used' })];

        // Act
        const actual = MetadataValidationResult.failure({ errors, warnings });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors).toEqual(errors);
        expect(actual.warnings).toEqual(warnings);
      });
    });
  });
});

target('MetadataValidationResult.hasErrors', () => {
  describe('エラー有無を判定する', () => {
    // UT-TM-075
    context('errorsが非空の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultFailure([createHarnessError()]);

        // Act
        const actual = sut.hasErrors();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-076
    context('errorsが空の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess();

        // Act
        const actual = sut.hasErrors();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('MetadataValidationResult.hasWarnings', () => {
  describe('警告有無を判定する', () => {
    // UT-TM-077
    context('warningsが非空の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess([createHarnessError()]);

        // Act
        const actual = sut.hasWarnings();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-078
    context('warningsが空の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess();

        // Act
        const actual = sut.hasWarnings();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('MetadataValidationResult.equals', () => {
  describe('2つのMetadataValidationResultの等価性を判定する', () => {
    // UT-TM-079
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataValidationResultSuccess([createHarnessError()]);
        const other = createMetadataValidationResultSuccess([createHarnessError()]);

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.12 `metadata-validator.test.ts`

```ts
target('MetadataValidator.validateImplementation', () => {
  describe('実装ファイルのメタデータを検証する', () => {
    // UT-TM-080
    context('@unitと@layerが両方正しい場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut, unitDefinitionPort } = createMetadataValidatorSut();
        unitDefinitionPort.hasUnit.mockResolvedValue(true);
        const tags = [
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ];

        // Act
        const actual = await sut.validateImplementation({
          filePath: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-081
    context('@unitが欠落している場合', () => {
      it('エラーを含むMetadataValidationResultを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = [createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 1 })];

        // Act
        const actual = await sut.validateImplementation({
          filePath: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@unit');
      });
    });

    // UT-TM-082
    context('@layerが欠落している場合', () => {
      it('エラーを含むMetadataValidationResultを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = [createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 })];

        // Act
        const actual = await sut.validateImplementation({
          filePath: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@layer');
      });
    });

    // UT-TM-083
    context('@layerが正規語彙以外の場合', () => {
      it('L2-002エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = [
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'adapter', lineNumber: 2 }),
        ];

        // Act
        const actual = await sut.validateImplementation({
          filePath: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].code).toBe('L2-002');
      });
    });

    // UT-TM-084
    context('@layerがlegacy語彙usecaseの場合', () => {
      it('L2-002エラーとして拒否されること', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = [
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'usecase', lineNumber: 2 }),
        ];

        // Act
        const actual = await sut.validateImplementation({
          filePath: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].code).toBe('L2-002');
      });
    });

    // UT-TM-085
    context('@layerがlegacy語彙portまたはcontrollerの場合', () => {
      it('いずれもL2-002エラーとして拒否されること', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const invalidTagsList = ['port', 'controller'].map((value) => [
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value, lineNumber: 2 }),
        ]);

        // Act
        const actual = await Promise.all(
          invalidTagsList.map((tags) =>
            sut.validateImplementation({
              filePath: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
              tags,
            }),
          ),
        );

        // Assert
        expect(actual.map((item) => item.errors[0].code)).toEqual(['L2-002', 'L2-002']);
      });
    });

    // UT-TM-086
    context('@unitの値がunit定義に存在しない場合', () => {
      it('エラーを含むMetadataValidationResultを返すこと', async () => {
        // Arrange
        const { sut, unitDefinitionPort } = createMetadataValidatorSut();
        unitDefinitionPort.hasUnit.mockResolvedValue(false);
        const tags = [
          createMetadataTag({ type: '@unit', value: 'unknown-unit', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ];

        // Act
        const actual = await sut.validateImplementation({
          filePath: createProjectRelativePath('scripts/harness/domain/story-id.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('unknown-unit');
      });
    });
  });
});

target('MetadataValidator.validateDesignDocument', () => {
  describe('設計文書のstory-idアノテーションを検証する', () => {
    // UT-TM-087
    context('@story-idが1件以上あり全て独立行かつcatalog存在時', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut, storyCatalogPort } = createMetadataValidatorSut();
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        const annotations = [createStoryIdAnnotation({ standaloneLine: true })];
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument({
          documentPath: createProjectRelativePath(),
          annotations,
          flags,
        });

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-088
    context('frontmatter initial_creation=trueの場合', () => {
      it('@story-id欠落が許容されvalid=trueを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const annotations = [];
        const flags = createDesignDocumentFlags(true);

        // Act
        const actual = await sut.validateDesignDocument({
          documentPath: createProjectRelativePath(),
          annotations,
          flags,
        });

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-089
    context('frontmatter未設定で@story-idが欠落している場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const annotations = [];
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument({
          documentPath: createProjectRelativePath(),
          annotations,
          flags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@story-id');
      });
    });

    // UT-TM-090
    context('@story-idが独立行でない場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const annotations = [createStoryIdAnnotation({ standaloneLine: false })];
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument({
          documentPath: createProjectRelativePath(),
          annotations,
          flags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('独立行');
      });
    });

    // UT-TM-091
    context('@story-idの値がStoryCatalogに存在しない場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut, storyCatalogPort } = createMetadataValidatorSut();
        storyCatalogPort.hasStoryId.mockResolvedValue(false);
        const annotations = [createStoryIdAnnotation({ storyId: StoryId.parse('H03-99') })];
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument({
          documentPath: createProjectRelativePath(),
          annotations,
          flags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('H03-99');
      });
    });

    // UT-TM-092
    context('annotations空配列でinitialCreation=falseの場合', () => {
      it('@story-id必須エラーを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument({
          documentPath: createProjectRelativePath(),
          annotations: [],
          flags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('必須');
      });
    });

    // UT-TM-093
    context('複数の@story-idが全て正常な場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut, storyCatalogPort } = createMetadataValidatorSut();
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        const annotations = [
          createStoryIdAnnotation({ storyId: StoryId.parse('H03-01'), lineNumber: 10 }),
          createStoryIdAnnotation({ storyId: StoryId.parse('H03-02'), lineNumber: 20 }),
        ];
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument({
          documentPath: createProjectRelativePath(),
          annotations,
          flags,
        });

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });
  });
});

target('MetadataValidator.validateTest', () => {
  describe('テストファイルのstoryメタデータを検証する', () => {
    // UT-TM-094
    context('@storyが1件以上あり正規StoryIdとして解決可能な場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut, storyCatalogPort } = createMetadataValidatorSut();
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        const tags = [createMetadataTag({ type: '@story', value: 'H03-03', lineNumber: 1 })];

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-095
    context('@storyタグが欠落している場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = [createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 })];

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@story');
      });
    });

    // UT-TM-096
    context('@storyの値がStoryCatalogに存在しない場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut, storyCatalogPort } = createMetadataValidatorSut();
        storyCatalogPort.hasStoryId.mockResolvedValue(false);
        const tags = [createMetadataTag({ type: '@story', value: 'H03-99', lineNumber: 1 })];

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('H03-99');
      });
    });

    // UT-TM-097
    context('@storyの値がHXX-XX形式でない場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = [createMetadataTag({ type: '@story', value: 'US-001', lineNumber: 1 })];

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('形式');
      });
    });

    // UT-TM-098
    context('複数の@storyが全て正常な場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut, storyCatalogPort } = createMetadataValidatorSut();
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        const tags = [
          createMetadataTag({ type: '@story', value: 'H03-01', lineNumber: 1 }),
          createMetadataTag({ type: '@story', value: 'H03-02', lineNumber: 2 }),
        ];

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-099
    context('複数の@storyのうち1件が不正な場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut, storyCatalogPort } = createMetadataValidatorSut();
        storyCatalogPort.hasStoryId.mockImplementation(async (storyId) => storyId === 'H03-01');
        const tags = [
          createMetadataTag({ type: '@story', value: 'H03-01', lineNumber: 1 }),
          createMetadataTag({ type: '@story', value: 'H03-99', lineNumber: 2 }),
        ];

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors.some((error) => error.message.includes('H03-99'))).toBe(true);
      });
    });

    // UT-TM-100
    context('tagsが空配列の場合', () => {
      it('@story必須エラーを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags: [],
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@story');
      });
    });

    // UT-TM-101
    context('@story以外のタグのみ存在する場合', () => {
      it('@story必須エラーを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = [
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ];

        // Act
        const actual = await sut.validateTest({
          filePath: createProjectRelativePath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
          tags,
        });

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@story');
      });
    });
  });
});
```

### 3.13 `story-id-alias-resolver.test.ts`

```ts
target('StoryIdAliasResolver.isLegacyFormat', () => {
  describe('レガシー形式を判定する', () => {
    // UT-TM-102
    context('US-XXX形式の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut();

        // Act
        const actual = sut.isLegacyFormat('US-123');

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-103
    context('HXX-XX形式の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut();

        // Act
        const actual = sut.isLegacyFormat('H03-01');

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-TM-104
    context('どちらの形式にも該当しない場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut();

        // Act
        const actual = sut.isLegacyFormat('story-001');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('StoryIdAliasResolver.resolve', () => {
  describe('レガシーIDを正規StoryIdに解決する', () => {
    // UT-TM-105
    context('alias mapに存在するレガシーIDの場合', () => {
      it('対応する正規StoryIdを返すこと', async () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut({ 'US-123': 'H03-01' });

        // Act
        const actual = await sut.resolve('US-123');

        // Assert
        expect(actual?.value).toBe('H03-01');
      });
    });

    // UT-TM-106
    context('alias mapに存在しないレガシーIDの場合', () => {
      it('nullを返すこと', async () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut({ 'US-123': 'H03-01' });

        // Act
        const actual = await sut.resolve('US-999');

        // Assert
        expect(actual).toBeNull();
      });
    });

    // UT-TM-107
    context('空のalias mapの場合', () => {
      it('nullを返すこと', async () => {
        // Arrange
        const { sut } = createStoryIdAliasResolverSut({});

        // Act
        const actual = await sut.resolve('US-123');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
```

### 3.14 `traceability-chain-builder.test.ts`

```ts
target('TraceabilityChainBuilder.build', () => {
  describe('実装ファイル起点でトレーサビリティチェーンを構築する', () => {
    // UT-TM-108
    context('全リンクが解決可能な場合', () => {
      it('isComplete=trueのTraceabilityChainを返すこと', async () => {
        // Arrange
        const {
          sut,
          metadataReaderPort,
          unitDefinitionPort,
          designDocumentPort,
          storyCatalogPort,
          inceptionPlanPort,
        } = createTraceabilityChainBuilderSut();
        const origin = createProjectRelativePath('scripts/harness/domain/story-id.ts');
        metadataReaderPort.readImplementationTags.mockResolvedValue([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        unitDefinitionPort.resolveConstructionRoot.mockResolvedValue(
          createProjectRelativePath('docs/product/construction/traceability-model'),
        );
        designDocumentPort.findConstructionDocuments.mockResolvedValue([
          createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        designDocumentPort.readStoryIdAnnotations.mockResolvedValue([
          createStoryIdAnnotation({ storyId: StoryId.parse('H03-01') }),
        ]);
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        inceptionPlanPort.findPlanByStoryId.mockResolvedValue(
          createProjectRelativePath('inception/traceability-model/H03-01/unit_test_logic_plan.md'),
        );

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(actual.isComplete()).toBe(true);
        expect(actual.links.map((link) => link.linkType)).toEqual([
          'implementation-to-unit',
          'unit-to-design',
          'design-to-story',
          'story-to-plan',
        ]);
      });
    });

    // UT-TM-109
    context('construction文書が欠落している場合', () => {
      it('unit-to-designリンクがbrokenとなるチェーンを返すこと', async () => {
        // Arrange
        const { sut, metadataReaderPort, unitDefinitionPort, designDocumentPort } =
          createTraceabilityChainBuilderSut();
        const origin = createProjectRelativePath('scripts/harness/domain/story-id.ts');
        metadataReaderPort.readImplementationTags.mockResolvedValue([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        unitDefinitionPort.resolveConstructionRoot.mockResolvedValue(
          createProjectRelativePath('docs/product/construction/traceability-model'),
        );
        designDocumentPort.findConstructionDocuments.mockResolvedValue([]);

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(actual.isComplete()).toBe(false);
        expect(actual.getBrokenLinks()[0].linkType).toBe('unit-to-design');
      });
    });

    // UT-TM-110
    context('@story-idアノテーションが欠落している場合', () => {
      it('design-to-storyリンクがbrokenとなるチェーンを返すこと', async () => {
        // Arrange
        const { sut, metadataReaderPort, unitDefinitionPort, designDocumentPort } =
          createTraceabilityChainBuilderSut();
        const origin = createProjectRelativePath('scripts/harness/domain/story-id.ts');
        metadataReaderPort.readImplementationTags.mockResolvedValue([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        unitDefinitionPort.resolveConstructionRoot.mockResolvedValue(
          createProjectRelativePath('docs/product/construction/traceability-model'),
        );
        designDocumentPort.findConstructionDocuments.mockResolvedValue([
          createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        designDocumentPort.readStoryIdAnnotations.mockResolvedValue([]);

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(actual.isComplete()).toBe(false);
        expect(actual.getBrokenLinks()[0].linkType).toBe('design-to-story');
      });
    });

    // UT-TM-111
    context('inception planが欠落している場合', () => {
      it('story-to-planリンクがbrokenとなるチェーンを返すこと', async () => {
        // Arrange
        const {
          sut,
          metadataReaderPort,
          unitDefinitionPort,
          designDocumentPort,
          storyCatalogPort,
          inceptionPlanPort,
        } = createTraceabilityChainBuilderSut();
        const origin = createProjectRelativePath('scripts/harness/domain/story-id.ts');
        metadataReaderPort.readImplementationTags.mockResolvedValue([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        unitDefinitionPort.resolveConstructionRoot.mockResolvedValue(
          createProjectRelativePath('docs/product/construction/traceability-model'),
        );
        designDocumentPort.findConstructionDocuments.mockResolvedValue([
          createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        designDocumentPort.readStoryIdAnnotations.mockResolvedValue([
          createStoryIdAnnotation({ storyId: StoryId.parse('H03-01') }),
        ]);
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        inceptionPlanPort.findPlanByStoryId.mockResolvedValue(null);

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(actual.isComplete()).toBe(false);
        expect(actual.getBrokenLinks()[0].linkType).toBe('story-to-plan');
      });
    });

    // UT-TM-112
    context('@unitメタデータが欠落している場合', () => {
      it('implementation-to-unitリンクがbrokenとなるチェーンを返すこと', async () => {
        // Arrange
        const { sut, metadataReaderPort } = createTraceabilityChainBuilderSut();
        const origin = createProjectRelativePath('scripts/harness/domain/story-id.ts');
        metadataReaderPort.readImplementationTags.mockResolvedValue([
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 1 }),
        ]);

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(actual.isComplete()).toBe(false);
        expect(actual.getBrokenLinks()[0].linkType).toBe('implementation-to-unit');
      });
    });

    // UT-TM-113
    context('起点パスが不正な場合', () => {
      it('ProjectRelativePathErrorが発生すること', async () => {
        // Arrange
        const { sut } = createTraceabilityChainBuilderSut();
        const origin = '/tmp/story-id.ts';

        // Act
        const actual = sut.build(origin);

        // Assert
        await expect(actual).rejects.toThrow(ProjectRelativePathError);
      });
    });

    // UT-TM-114
    context('複数の設計文書が存在する場合', () => {
      it('各設計文書に対するリンクが全て構築されること', async () => {
        // Arrange
        const {
          sut,
          metadataReaderPort,
          unitDefinitionPort,
          designDocumentPort,
          storyCatalogPort,
          inceptionPlanPort,
        } = createTraceabilityChainBuilderSut();
        const origin = createProjectRelativePath('scripts/harness/domain/story-id.ts');
        metadataReaderPort.readImplementationTags.mockResolvedValue([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        unitDefinitionPort.resolveConstructionRoot.mockResolvedValue(
          createProjectRelativePath('docs/product/construction/traceability-model'),
        );
        designDocumentPort.findConstructionDocuments.mockResolvedValue([
          createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
          createProjectRelativePath('docs/product/construction/traceability-model/unit_test_design.md'),
        ]);
        designDocumentPort.readStoryIdAnnotations
          .mockResolvedValueOnce([createStoryIdAnnotation({ storyId: StoryId.parse('H03-01') })])
          .mockResolvedValueOnce([createStoryIdAnnotation({ storyId: StoryId.parse('H03-02') })]);
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        inceptionPlanPort.findPlanByStoryId.mockResolvedValue(
          createProjectRelativePath('inception/traceability-model/H03-01/unit_test_logic_plan.md'),
        );

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(actual.links.filter((link) => link.linkType === 'unit-to-design')).toHaveLength(2);
        expect(actual.links.filter((link) => link.linkType === 'design-to-story')).toHaveLength(2);
        expect(actual.links.filter((link) => link.linkType === 'story-to-plan')).toHaveLength(2);
      });
    });

    // UT-TM-115
    context('構築結果のlink type順序を確認する場合', () => {
      it('implementation-to-unitとunit-to-designとdesign-to-storyとstory-to-planの順序でリンクが並ぶこと', async () => {
        // Arrange
        const {
          sut,
          metadataReaderPort,
          unitDefinitionPort,
          designDocumentPort,
          storyCatalogPort,
          inceptionPlanPort,
        } = createTraceabilityChainBuilderSut();
        const origin = createProjectRelativePath('scripts/harness/domain/story-id.ts');
        metadataReaderPort.readImplementationTags.mockResolvedValue([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        unitDefinitionPort.resolveConstructionRoot.mockResolvedValue(
          createProjectRelativePath('docs/product/construction/traceability-model'),
        );
        designDocumentPort.findConstructionDocuments.mockResolvedValue([
          createProjectRelativePath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        designDocumentPort.readStoryIdAnnotations.mockResolvedValue([
          createStoryIdAnnotation({ storyId: StoryId.parse('H03-01') }),
        ]);
        storyCatalogPort.hasStoryId.mockResolvedValue(true);
        inceptionPlanPort.findPlanByStoryId.mockResolvedValue(
          createProjectRelativePath('inception/traceability-model/H03-01/unit_test_logic_plan.md'),
        );

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(actual.links.map((link) => link.linkType)).toEqual([
          'implementation-to-unit',
          'unit-to-design',
          'design-to-story',
          'story-to-plan',
        ]);
      });
    });
  });
});
```

## 4. モック戦略

- 値オブジェクト `StoryId`、`ProjectRelativePath`、`MetadataTag`、`UnitReference`、`LayerReference`、`StoryReference`、`StoryIdAnnotation`、`DesignDocumentFlags`、`ChainLink`、`TraceabilityChain`、`MetadataValidationResult` は全て実体生成する。
- `MetadataValidator` は `StoryCatalogPort` と `UnitDefinitionPort` のみを `vi.fn()` で差し替え、入力タグ・注釈・フラグは実体を使う。
- `StoryIdAliasResolver` は `StoryCatalogPort.getLegacyStoryIdAliases()` だけをモックし、戻り値は `Record<string, string>` の固定fixtureを使う。
- `TraceabilityChainBuilder` は `MetadataReaderPort`、`UnitDefinitionPort`、`DesignDocumentPort`、`StoryCatalogPort`、`InceptionPlanPort` をモックし、返却値は `ProjectRelativePath`・`StoryIdAnnotation` の実体で揃える。
- `HarnessError` は外部所有型のため、ドメイン内部で生成する完全実体ではなく最小限のテストダブルファクトリ `createHarnessError()` で扱う。
- `beforeEach` に隠れたArrangeは置かず、各 `it` 内で必要なモック設定を完結させる。

## 5. 境界値テスト一覧
| ケースID | 対象 | 境界条件 | 入力例 | 期待結果 |
|---|---|---|---|---|
| UT-TM-002 | StoryId | 前後空白の正規入力 | `'  H03-01  '` | trim後に生成成功 |
| UT-TM-003 | StoryId | 桁不足・形式不正 | `'HX-1'` | `StoryIdFormatError` |
| UT-TM-004 | StoryId | legacy形式 | `'US-123'` | `StoryIdFormatError` |
| UT-TM-005 | StoryId | 空文字 | `''` | `StoryIdFormatError` |
| UT-TM-011 | ProjectRelativePath | 空文字 | `''` | `ProjectRelativePathError` |
| UT-TM-012 | ProjectRelativePath | 絶対パス | `'/tmp/file.ts'` | `ProjectRelativePathError` |
| UT-TM-013 | ProjectRelativePath | ルート脱出 | `'../outside/file.ts'` | `ProjectRelativePathError` |
| UT-TM-014 | ProjectRelativePath | バックスラッシュ混在 | `'docs\\product\\x.md'` | `ProjectRelativePathError` |
| UT-TM-015 | ProjectRelativePath | 許可外ルート | `'package.json'` | `ProjectRelativePathError` |
| UT-TM-027 | MetadataTag | 最小未満行番号 | `lineNumber: 0` | 生成エラー |
| UT-TM-037 | LayerReference | 正規語彙の複数値 | `'application'`, `'infrastructure'`, `'presentation'` | いずれも `valid=true` |
| UT-TM-038 | LayerReference | legacy語彙 | `'usecase'` | `valid=false` |
| UT-TM-039 | LayerReference | legacy語彙の複数値 | `'port'`, `'controller'` | いずれも `valid=false` |
| UT-TM-047 | StoryIdAnnotation | 最小未満行番号 | `lineNumber: 0` | 生成エラー |
| UT-TM-051 | DesignDocumentFlags | 初回作成フラグON | `initialCreation: true` | `requiresStoryIdAnnotation=false` |
| UT-TM-052 | DesignDocumentFlags | 初回作成フラグOFF | `initialCreation: false` | `requiresStoryIdAnnotation=true` |
| UT-TM-058 | ChainLink | linkType境界外 | `'implementation-to-document'` | 生成エラー |
| UT-TM-063 | TraceabilityChain | broken link混在 | `resolved=false` を1件含む | `isComplete=false` |
| UT-TM-064 | TraceabilityChain | links空配列 | `[]` | `isComplete=true` |
| UT-TM-067 | TraceabilityChain | links空配列 | `[]` | `getResolvedLinks=[]` |
| UT-TM-088 | MetadataValidator | 初回作成時の注釈省略 | `annotations: []`, `initialCreation: true` | `valid=true` |
| UT-TM-092 | MetadataValidator | 非初回で注釈0件 | `annotations: []`, `initialCreation: false` | `@story-id` 必須エラー |
| UT-TM-097 | MetadataValidator | @story形式不正 | `'US-001'` | 検証エラー |
| UT-TM-100 | MetadataValidator | タグ空配列 | `[]` | `@story` 必須エラー |
| UT-TM-107 | StoryIdAliasResolver | alias map空 | `{}` | `null` |
| UT-TM-113 | TraceabilityChainBuilder | 不正な起点パス | `'/tmp/story-id.ts'` | `ProjectRelativePathError` |
