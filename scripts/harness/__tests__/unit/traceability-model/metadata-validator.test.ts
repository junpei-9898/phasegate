// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { DesignDocumentFlags } from '../../../traceability-model/domain/value-objects/design-document-flags.ts';
import { StoryIdAnnotation } from '../../../traceability-model/domain/value-objects/story-id-annotation.ts';
import { MetadataValidator } from '../../../traceability-model/domain/services/metadata-validator.ts';

const createStoryId = (value = 'H03-01') =>
  Object.freeze({
    value,
    equals(other: { readonly value: string }) {
      return other.value === value;
    },
  });

const createPath = (
  value = 'docs/product/construction/traceability-model/domain_model.md',
) =>
  Object.freeze({
    value,
    toString() {
      return value;
    },
    equals(other: { readonly value: string }) {
      return other.value === value;
    },
  });

const createMetadataTag = (
  overrides: Partial<{
    type: '@unit' | '@layer' | '@story-id' | '@story';
    value: string;
    lineNumber: number;
    filePath: ReturnType<typeof createPath>;
  }> = {},
) =>
  Object.freeze({
    type: '@unit' as const,
    value: 'traceability-model',
    lineNumber: 1,
    filePath: createPath('scripts/harness/domain/story-id.ts'),
    ...overrides,
  });

const createStoryIdAnnotation = (
  overrides: Partial<{
    storyId: ReturnType<typeof createStoryId>;
    lineNumber: number;
    contextLine: string;
    standaloneLine: boolean;
  }> = {},
) =>
  StoryIdAnnotation.create(
    Object.freeze({
      storyId: createStoryId(),
      lineNumber: 8,
      contextLine: '## StoryIdを検証する',
      standaloneLine: true,
      ...overrides,
    }),
  );

const createDesignDocumentFlags = (initialCreation = false) =>
  DesignDocumentFlags.create(Object.freeze({ initialCreation }));

const createMetadataValidatorSut = (overrides?: {
  storyExists?: (storyId: string) => Promise<boolean>;
  unitExists?: (unitName: string) => Promise<boolean>;
}) => {
  const storyCatalogPort = Object.freeze({
    async exists(storyId: { readonly value: string }) {
      return overrides?.storyExists
        ? overrides.storyExists(storyId.value)
        : true;
    },
  });
  const unitDefinitionPort = Object.freeze({
    async exists(unitName: string) {
      return overrides?.unitExists ? overrides.unitExists(unitName) : true;
    },
  });

  return Object.freeze({
    sut: new MetadataValidator({
      storyCatalogPort,
      unitDefinitionPort,
    }),
  });
};

target('MetadataValidator.validateImplementation', () => {
  describe('実装ファイルのメタデータを検証する', () => {
    // UT-TM-080
    context('@unitと@layerが両方正しい場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = Object.freeze([
          createMetadataTag({
            type: '@unit',
            value: 'traceability-model',
            lineNumber: 1,
          }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

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
        const tags = Object.freeze([
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 1 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

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
        const tags = Object.freeze([
          createMetadataTag({
            type: '@unit',
            value: 'traceability-model',
            lineNumber: 1,
          }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

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
        const tags = Object.freeze([
          createMetadataTag({
            type: '@unit',
            value: 'traceability-model',
            lineNumber: 1,
          }),
          createMetadataTag({ type: '@layer', value: 'adapter', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

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
        const tags = Object.freeze([
          createMetadataTag({
            type: '@unit',
            value: 'traceability-model',
            lineNumber: 1,
          }),
          createMetadataTag({ type: '@layer', value: 'usecase', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

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
        const invalidTagsList = Object.freeze(
          ['port', 'controller'].map((value) =>
            Object.freeze([
              createMetadataTag({
                type: '@unit',
                value: 'traceability-model',
                lineNumber: 1,
              }),
              createMetadataTag({ type: '@layer', value, lineNumber: 2 }),
            ]),
          ),
        );

        // Act
        const actual = await Promise.all(
          invalidTagsList.map((tags) =>
            sut.validateImplementation(
              Object.freeze({
                filePath: createPath('scripts/harness/domain/story-id.ts'),
                tags,
              }),
            ),
          ),
        );

        // Assert
        expect(actual.map((item) => item.errors[0].code)).toEqual([
          'L2-002',
          'L2-002',
        ]);
      });
    });

    // UT-TM-086
    context('@unitの値がunit定義に存在しない場合', () => {
      it('エラーを含むMetadataValidationResultを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut({
          unitExists: async () => false,
        });
        const tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'unknown-unit', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('unknown-unit');
      });
    });

    // UT-TM-120
    context('複数 @unit の全件が有効な場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const validUnits = ['traceability-model', 'phase-gate'];
        const { sut } = createMetadataValidatorSut({
          unitExists: async (name) => validUnits.includes(name),
        });
        const tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@unit', value: 'phase-gate', lineNumber: 2 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 3 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-121
    context('2つの @unit のうち1つが不正な場合', () => {
      it('不正な @unit のエラーを1件含む結果を返すこと', async () => {
        // Arrange
        const validUnits = ['traceability-model'];
        const { sut } = createMetadataValidatorSut({
          unitExists: async (name) => validUnits.includes(name),
        });
        const tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@unit', value: 'nonexistent-unit', lineNumber: 2 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 3 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors).toHaveLength(1);
        expect(actual.errors[0].message).toContain('nonexistent-unit');
      });
    });

    // UT-TM-122
    context('単一 @unit の後方互換', () => {
      it('単一の有効な @unit でvalid=trueを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-123
    context('@unit が0個の場合', () => {
      it('@unit 必須エラーを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = Object.freeze([
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 1 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@unit');
        expect(actual.errors[0].message).toContain('必要');
      });
    });

    // UT-TM-116
    context('@unitの値がunit定義に存在しない場合', () => {
      it('errors[0].code==="L2-002" を満たすMetadataValidationResultが返ること', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut({
          unitExists: async () => false,
        });
        const tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'unknown-unit', lineNumber: 1 }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateImplementation(
          Object.freeze({
            filePath: createPath('scripts/harness/domain/story-id.ts'),
            tags,
          }),
        );

        // Assert
        expect(actual.errors[0].code).toBe('L2-002');
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
        const { sut } = createMetadataValidatorSut();
        const annotations = Object.freeze([
          createStoryIdAnnotation({ standaloneLine: true }),
        ]);
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations,
            flags,
          }),
        );

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
        const annotations = Object.freeze([]);
        const flags = createDesignDocumentFlags(true);

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations,
            flags,
          }),
        );

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
        const annotations = Object.freeze([]);
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations,
            flags,
          }),
        );

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
        const annotations = Object.freeze([
          createStoryIdAnnotation({ standaloneLine: false }),
        ]);
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations,
            flags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('独立行');
      });
    });

    // UT-TM-091
    context('@story-idの値がStoryCatalogに存在しない場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut({
          storyExists: async () => false,
        });
        const annotations = Object.freeze([
          createStoryIdAnnotation({ storyId: createStoryId('H03-99') }),
        ]);
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations,
            flags,
          }),
        );

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
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations: Object.freeze([]),
            flags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('必須');
      });
    });

    // UT-TM-093
    context('複数の@story-idが全て正常な場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const annotations = Object.freeze([
          createStoryIdAnnotation({
            storyId: createStoryId('H03-01'),
            lineNumber: 10,
          }),
          createStoryIdAnnotation({
            storyId: createStoryId('H03-02'),
            lineNumber: 20,
          }),
        ]);
        const flags = createDesignDocumentFlags(false);

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations,
            flags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-117
    context('frontmatter未設定で@story-idが欠落している場合', () => {
      it('errors[0].code==="L2-002" かつ errors[0].fix_example に `@story-id H03-02` 形式の修正例を含むこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations: Object.freeze([]),
            flags: createDesignDocumentFlags(false),
          }),
        );

        // Assert
        expect(actual.errors[0].code).toBe('L2-002');
        expect(actual.errors[0].fix_example).toContain('@story-id H03-02');
      });
    });

    // UT-TM-118
    context('@story-idが独立行だが次行が空行で設計要素の直前でない場合', () => {
      it('L2-002エラーを含む結果が返ること', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const annotations = Object.freeze([
          createStoryIdAnnotation({
            standaloneLine: true,
            contextLine: '',
          }),
        ]);

        // Act
        const actual = await sut.validateDesignDocument(
          Object.freeze({
            documentPath: createPath(),
            annotations,
            flags: createDesignDocumentFlags(false),
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].code).toBe('L2-002');
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
        const { sut } = createMetadataValidatorSut();
        const tags = Object.freeze([
          createMetadataTag({ type: '@story', value: 'H03-03', lineNumber: 1 }),
        ]);

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags,
          }),
        );

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
        const tags = Object.freeze([
          createMetadataTag({
            type: '@unit',
            value: 'traceability-model',
            lineNumber: 1,
          }),
        ]);

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@story');
      });
    });

    // UT-TM-096
    context('@storyの値がStoryCatalogに存在しない場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut({
          storyExists: async () => false,
        });
        const tags = Object.freeze([
          createMetadataTag({ type: '@story', value: 'H03-99', lineNumber: 1 }),
        ]);

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags,
          }),
        );

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
        const tags = Object.freeze([
          createMetadataTag({ type: '@story', value: 'US-001', lineNumber: 1 }),
        ]);

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('形式');
      });
    });

    // UT-TM-098
    context('複数の@storyが全て正常な場合', () => {
      it('valid=trueを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();
        const tags = Object.freeze([
          createMetadataTag({ type: '@story', value: 'H03-01', lineNumber: 1 }),
          createMetadataTag({ type: '@story', value: 'H03-02', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toEqual([]);
      });
    });

    // UT-TM-099
    context('複数の@storyのうち1件が不正な場合', () => {
      it('エラーを含む結果を返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut({
          storyExists: async (storyId) => storyId === 'H03-01',
        });
        const tags = Object.freeze([
          createMetadataTag({ type: '@story', value: 'H03-01', lineNumber: 1 }),
          createMetadataTag({ type: '@story', value: 'H03-99', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(
          actual.errors.some((error) => error.message.includes('H03-99')),
        ).toBe(true);
      });
    });

    // UT-TM-100
    context('tagsが空配列の場合', () => {
      it('@story必須エラーを返すこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags: Object.freeze([]),
          }),
        );

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
        const tags = Object.freeze([
          createMetadataTag({
            type: '@unit',
            value: 'traceability-model',
            lineNumber: 1,
          }),
          createMetadataTag({ type: '@layer', value: 'domain', lineNumber: 2 }),
        ]);

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags,
          }),
        );

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0].message).toContain('@story');
      });
    });

    // UT-TM-119
    context('@storyタグが欠落している場合', () => {
      it('errors[0].code==="L2-002" かつ errors[0].fix_example に `// @story H03-03` 形式の修正例を含むこと', async () => {
        // Arrange
        const { sut } = createMetadataValidatorSut();

        // Act
        const actual = await sut.validateTest(
          Object.freeze({
            filePath: createPath(
              'scripts/harness/__tests__/traceability-model/domain/story-id.test.ts',
            ),
            tags: Object.freeze([]),
          }),
        );

        // Assert
        expect(actual.errors[0].code).toBe('L2-002');
        expect(actual.errors[0].fix_example).toContain('// @story H03-03');
      });
    });
  });
});
