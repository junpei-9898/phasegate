// @layer test
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.ts';
import {
  TraceabilityCoverageApplicationError,
  VerifyTraceabilityCoverageUseCase,
} from '../../../traceability-model/application/usecases/verify-traceability-coverage-usecase.ts';

const createPath = (value: string) => ProjectRelativePath.create(value);

const createChainOutput = (overrides: Partial<{
  origin: string;
  complete: boolean;
  links: Array<{
    from: string;
    to: string;
    linkType:
      | 'implementation-to-unit'
      | 'unit-to-design'
      | 'design-to-story'
      | 'story-to-plan';
    resolved: boolean;
  }>;
  brokenLinks: Array<{
    from: string;
    to: string;
    linkType:
      | 'implementation-to-unit'
      | 'unit-to-design'
      | 'design-to-story'
      | 'story-to-plan';
    resolved: boolean;
  }>;
}> = {}) =>
  ({
    origin: 'scripts/harness/traceability-model/domain/value-objects/story-id.ts',
    complete: true,
    links: [
      {
        from: 'scripts/harness/traceability-model/domain/value-objects/story-id.ts',
        to: 'docs/product/construction/traceability-model',
        linkType: 'implementation-to-unit' as const,
        resolved: true,
      },
    ],
    brokenLinks: [] as Array<{ from: string; to: string; linkType: 'implementation-to-unit' | 'unit-to-design' | 'design-to-story' | 'story-to-plan'; resolved: boolean }>,
    ...overrides,
  });

const createSut = () => {
  const buildTraceabilityChainUseCase = {
    execute: vi.fn(),
  };

  return {
    buildTraceabilityChainUseCase,
    sut: new VerifyTraceabilityCoverageUseCase({
      buildTraceabilityChainUseCase,
    }),
  };
};

target('VerifyTraceabilityCoverageUseCase.execute', () => {
  describe('複数ファイルのトレーサビリティカバレッジを集計する', () => {
    // IT-TM-021
    context('2件の対象ファイルすべてがcompleteなchainを返す場合', () => {
      it('全チェーンが完全な場合にincompleteChains=0で返ること', async () => {
        // Arrange
        const { sut, buildTraceabilityChainUseCase } = createSut();
        const filePaths = [
          createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
          createPath('scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts'),
        ];
        buildTraceabilityChainUseCase.execute
          .mockResolvedValueOnce(createChainOutput())
          .mockResolvedValueOnce(
            createChainOutput({
              origin: 'scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts',
            }),
          );

        // Act
        const actual = await sut.execute(filePaths);

        // Assert
        expect(actual.incompleteChains).toBe(0);
        expect(actual.completeChains).toBe(2);
        expect(actual.totalFiles).toBe(2);
      });
    });

    // IT-TM-022
    context('3件中1件だけcomplete=falseの場合', () => {
      it('brokenLinkを含むチェーンがincompleteとして集計されること', async () => {
        // Arrange
        const { sut, buildTraceabilityChainUseCase } = createSut();
        const filePaths = [
          createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
          createPath('scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts'),
          createPath('scripts/harness/traceability-model/domain/services/metadata-validator.ts'),
        ];
        buildTraceabilityChainUseCase.execute
          .mockResolvedValueOnce(createChainOutput())
          .mockResolvedValueOnce(
            createChainOutput({
              origin: 'scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts',
            }),
          )
          .mockResolvedValueOnce(
            createChainOutput({
              origin: 'scripts/harness/traceability-model/domain/services/metadata-validator.ts',
              complete: false,
              brokenLinks: [
                {
                  from: 'docs/product/construction/traceability-model',
                  to: 'docs/product/construction/traceability-model/domain_model.md',
                  linkType: 'unit-to-design' as const,
                  resolved: false,
                },
              ],
            }),
          );

        // Act
        const actual = await sut.execute(filePaths);

        // Assert
        expect(actual.completeChains).toBe(2);
        expect(actual.incompleteChains).toBe(1);
        expect(actual.results[2].brokenLinks.length).toBeGreaterThan(0);
      });
    });

    // IT-TM-023
    context('5件の入力をそのまま処理する場合', () => {
      it('totalFilesが入力ファイル数と一致すること', async () => {
        // Arrange
        const { sut, buildTraceabilityChainUseCase } = createSut();
        const filePaths = [
          createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
          createPath('scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts'),
          createPath('scripts/harness/traceability-model/domain/services/metadata-validator.ts'),
          createPath('scripts/harness/traceability-model/domain/services/story-id-alias-resolver.ts'),
          createPath('scripts/harness/traceability-model/domain/services/traceability-chain-builder.ts'),
        ];
        buildTraceabilityChainUseCase.execute.mockResolvedValue(createChainOutput());

        // Act
        const actual = await sut.execute(filePaths);

        // Assert
        expect(actual.totalFiles).toBe(5);
        expect(buildTraceabilityChainUseCase.execute).toHaveBeenCalledTimes(5);
      });
    });

    // IT-TM-024
    context('途中の1件でchain構築例外が発生する場合', () => {
      it('BuildTraceabilityChainUseCaseがエラーを投げた場合にTraceabilityCoverageApplicationErrorが発生すること', async () => {
        // Arrange
        const { sut, buildTraceabilityChainUseCase } = createSut();
        const filePaths = [
          createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
          createPath('scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts'),
        ];
        buildTraceabilityChainUseCase.execute
          .mockResolvedValueOnce(createChainOutput())
          .mockRejectedValueOnce(new Error('chain build failed'));

        // Act
        const actual = sut.execute(filePaths);

        // Assert
        await expect(actual).rejects.toThrow(TraceabilityCoverageApplicationError);
      });
    });

    // IT-TM-025
    context('入力配列が空の場合', () => {
      it('空のfilePathsが渡された場合にtotalFiles=0で返ること', async () => {
        // Arrange
        const { sut, buildTraceabilityChainUseCase } = createSut();

        // Act
        const actual = await sut.execute([]);

        // Assert
        expect(actual.totalFiles).toBe(0);
        expect(actual.completeChains).toBe(0);
        expect(actual.incompleteChains).toBe(0);
        expect(actual.results).toEqual([]);
        expect(buildTraceabilityChainUseCase.execute).not.toHaveBeenCalled();
      });
    });

    // IT-TM-106
    context('完全チェーン1件と不完全チェーン2件でbroken link合計3件の場合', () => {
      it('brokenLinks総数が明示集計されること', async () => {
        // Arrange
        const { sut, buildTraceabilityChainUseCase } = createSut();
        const filePaths = [
          createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
          createPath('scripts/harness/traceability-model/domain/value-objects/project-relative-path.ts'),
          createPath('scripts/harness/traceability-model/domain/services/metadata-validator.ts'),
        ];
        buildTraceabilityChainUseCase.execute
          .mockResolvedValueOnce(createChainOutput())
          .mockResolvedValueOnce(
            createChainOutput({
              complete: false,
              brokenLinks: [
                {
                  from: 'docs/product/construction/traceability-model',
                  to: 'docs/product/construction/traceability-model/domain_model.md',
                  linkType: 'unit-to-design' as const,
                  resolved: false,
                },
              ],
            }),
          )
          .mockResolvedValueOnce(
            createChainOutput({
              complete: false,
              brokenLinks: [
                {
                  from: 'docs/product/construction/traceability-model/domain_model.md',
                  to: 'docs/product/user_stories.md',
                  linkType: 'design-to-story' as const,
                  resolved: false,
                },
                {
                  from: 'docs/product/user_stories.md',
                  to: 'inception/traceability-model/H03-01/__missing__.md',
                  linkType: 'story-to-plan' as const,
                  resolved: false,
                },
              ],
            }),
          );

        // Act
        const actual = await sut.execute(filePaths);

        // Assert
        expect(actual.completeChains).toBe(1);
        expect(actual.incompleteChains).toBe(2);
        expect(actual.brokenLinks).toBe(3);
      });
    });
  });
});
