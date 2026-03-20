import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { StoryIdAnnotation } from '../../../traceability-model/domain/value-objects/story-id-annotation.ts';
import {
  ProjectRelativePathError,
  TraceabilityChainBuilder,
} from '../../../traceability-model/domain/services/traceability-chain-builder.ts';

const createStoryId = (value = 'H03-01') =>
  Object.freeze({
    value,
    equals(other: { readonly value: string }) {
      return other.value === value;
    },
  });

const createPath = (value: string) =>
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

const createTraceabilityChainBuilderSut = () => {
  const state = {
    tags: Object.freeze([]) as readonly ReturnType<typeof createMetadataTag>[],
    constructionRoot: null as ReturnType<typeof createPath> | null,
    designDocuments: Object.freeze([]) as readonly ReturnType<typeof createPath>[],
    annotationsQueue: [] as Array<readonly ReturnType<typeof createStoryIdAnnotation>[]>,
    storyExists: async () => true,
    planPath: null as ReturnType<typeof createPath> | null,
  };

  const metadataReaderPort = Object.freeze({
    async readImplementationTags() {
      return state.tags;
    },
  });
  const unitDefinitionPort = Object.freeze({
    async findConstructionRoot() {
      return state.constructionRoot;
    },
  });
  const designDocumentPort = Object.freeze({
    async listByUnit() {
      return state.designDocuments;
    },
    async readStoryAnnotations() {
      return state.annotationsQueue.shift() ?? Object.freeze([]);
    },
  });
  const storyCatalogPort = Object.freeze({
    async exists(storyId: { readonly value: string }) {
      return state.storyExists(storyId.value);
    },
  });
  const inceptionPlanPort = Object.freeze({
    async findPlanRoot() {
      return state.planPath;
    },
  });

  return Object.freeze({
    state,
    sut: new TraceabilityChainBuilder({
      metadataReaderPort,
      unitDefinitionPort,
      designDocumentPort,
      storyCatalogPort,
      inceptionPlanPort,
    }),
  });
};

target('TraceabilityChainBuilder.build', () => {
  describe('実装ファイル起点でトレーサビリティチェーンを構築する', () => {
    // UT-TM-108
    context('全リンクが解決可能な場合', () => {
      it('isComplete=trueのTraceabilityChainを返すこと', async () => {
        // Arrange
        const { sut, state } = createTraceabilityChainBuilderSut();
        const origin = createPath('scripts/harness/domain/story-id.ts');
        state.tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        state.constructionRoot = createPath('docs/product/construction/traceability-model');
        state.designDocuments = Object.freeze([
          createPath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        state.annotationsQueue = [
          Object.freeze([createStoryIdAnnotation({ storyId: createStoryId('H03-01') })]),
        ];
        state.storyExists = async () => true;
        state.planPath = createPath(
          'inception/traceability-model/H03-01/unit_test_logic_plan.md',
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
        const { sut, state } = createTraceabilityChainBuilderSut();
        const origin = createPath('scripts/harness/domain/story-id.ts');
        state.tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        state.constructionRoot = createPath('docs/product/construction/traceability-model');
        state.designDocuments = Object.freeze([]);

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
        const { sut, state } = createTraceabilityChainBuilderSut();
        const origin = createPath('scripts/harness/domain/story-id.ts');
        state.tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        state.constructionRoot = createPath('docs/product/construction/traceability-model');
        state.designDocuments = Object.freeze([
          createPath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        state.annotationsQueue = [Object.freeze([])];

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
        const { sut, state } = createTraceabilityChainBuilderSut();
        const origin = createPath('scripts/harness/domain/story-id.ts');
        state.tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        state.constructionRoot = createPath('docs/product/construction/traceability-model');
        state.designDocuments = Object.freeze([
          createPath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        state.annotationsQueue = [
          Object.freeze([createStoryIdAnnotation({ storyId: createStoryId('H03-01') })]),
        ];
        state.storyExists = async () => true;
        state.planPath = null;

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
        const { sut, state } = createTraceabilityChainBuilderSut();
        const origin = createPath('scripts/harness/domain/story-id.ts');
        state.tags = Object.freeze([
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
        const { sut, state } = createTraceabilityChainBuilderSut();
        const origin = createPath('scripts/harness/domain/story-id.ts');
        state.tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        state.constructionRoot = createPath('docs/product/construction/traceability-model');
        state.designDocuments = Object.freeze([
          createPath('docs/product/construction/traceability-model/domain_model.md'),
          createPath('docs/product/construction/traceability-model/unit_test_design.md'),
        ]);
        state.annotationsQueue = [
          Object.freeze([createStoryIdAnnotation({ storyId: createStoryId('H03-01') })]),
          Object.freeze([createStoryIdAnnotation({ storyId: createStoryId('H03-02') })]),
        ];
        state.storyExists = async () => true;
        state.planPath = createPath(
          'inception/traceability-model/H03-01/unit_test_logic_plan.md',
        );

        // Act
        const actual = await sut.build(origin);

        // Assert
        expect(
          actual.links.filter((link) => link.linkType === 'unit-to-design'),
        ).toHaveLength(2);
        expect(
          actual.links.filter((link) => link.linkType === 'design-to-story'),
        ).toHaveLength(2);
        expect(
          actual.links.filter((link) => link.linkType === 'story-to-plan'),
        ).toHaveLength(2);
      });
    });

    // UT-TM-115
    context('構築結果のlink type順序を確認する場合', () => {
      it('implementation-to-unitとunit-to-designとdesign-to-storyとstory-to-planの順序でリンクが並ぶこと', async () => {
        // Arrange
        const { sut, state } = createTraceabilityChainBuilderSut();
        const origin = createPath('scripts/harness/domain/story-id.ts');
        state.tags = Object.freeze([
          createMetadataTag({ type: '@unit', value: 'traceability-model', lineNumber: 1 }),
        ]);
        state.constructionRoot = createPath('docs/product/construction/traceability-model');
        state.designDocuments = Object.freeze([
          createPath('docs/product/construction/traceability-model/domain_model.md'),
        ]);
        state.annotationsQueue = [
          Object.freeze([createStoryIdAnnotation({ storyId: createStoryId('H03-01') })]),
        ];
        state.storyExists = async () => true;
        state.planPath = createPath(
          'inception/traceability-model/H03-01/unit_test_logic_plan.md',
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
