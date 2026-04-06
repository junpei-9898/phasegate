// @layer test
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ChainLink } from '../../../traceability-model/domain/value-objects/chain-link.ts';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.ts';
import { TraceabilityChain } from '../../../traceability-model/domain/value-objects/traceability-chain.ts';
import {
  BuildTraceabilityChainUseCase,
  TraceabilityChainBuildError,
} from '../../../traceability-model/application/usecases/build-traceability-chain-usecase.ts';

const createPath = (value: string) => ProjectRelativePath.create(value);

const createChainLink = (
  overrides: Partial<{
    from: ProjectRelativePath;
    to: ProjectRelativePath;
    linkType:
      | 'implementation-to-unit'
      | 'unit-to-design'
      | 'design-to-story'
      | 'story-to-plan';
    resolved: boolean;
  }> = {},
) =>
  ChainLink.create({
    from: createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
    to: createPath('docs/product/construction/traceability-model'),
    linkType: 'implementation-to-unit',
    resolved: true,
    ...overrides,
  });

const createTraceabilityChain = (broken = false) =>
  TraceabilityChain.create({
    origin: createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts'),
    links: Object.freeze([
      createChainLink(),
      createChainLink({
        from: createPath('docs/product/construction/traceability-model'),
        to: createPath('docs/product/construction/traceability-model/domain_model.md'),
        linkType: 'unit-to-design',
        resolved: !broken,
      }),
      createChainLink({
        from: createPath('docs/product/construction/traceability-model/domain_model.md'),
        to: createPath('docs/product/user_stories.md'),
        linkType: 'design-to-story',
      }),
      createChainLink({
        from: createPath('docs/product/user_stories.md'),
        to: createPath('scripts/harness/__tests__/unit/traceability-model/story-id.test.ts'),
        linkType: 'story-to-plan',
      }),
    ]),
  });

const createSut = () => {
  const builder = {
    build: vi.fn(),
  };

  return {
    builder,
    sut: new BuildTraceabilityChainUseCase({ builder }),
  };
};

target('BuildTraceabilityChainUseCase.execute', () => {
  describe('トレーサビリティチェーンをDTOへ写像する', () => {
    // IT-TM-017
    context('builderが完全なTraceabilityChainを返す場合', () => {
      it('builderの結果がTraceabilityChainOutput DTOに正しく写像されること', async () => {
        // Arrange
        const { sut, builder } = createSut();
        const origin = createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts');
        const chain = createTraceabilityChain();
        builder.build.mockResolvedValue(chain);

        // Act
        const actual = await sut.execute(origin);

        // Assert
        expect(actual.origin).toBe(origin.toString());
        expect(actual.links).toEqual(
          chain.links.map((link) => ({
            from: link.from.toString(),
            to: link.to.toString(),
            linkType: link.linkType,
            resolved: link.resolved,
          })),
        );
        expect(actual.brokenLinks).toEqual([]);
      });
    });

    // IT-TM-018
    context('すべてのlinkがresolved=trueの場合', () => {
      it('complete判定がchain.isComplete()に基づくこと', async () => {
        // Arrange
        const { sut, builder } = createSut();
        const origin = createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts');
        builder.build.mockResolvedValue(createTraceabilityChain());

        // Act
        const actual = await sut.execute(origin);

        // Assert
        expect(actual.complete).toBe(true);
      });
    });

    // IT-TM-019
    context('1本以上resolved=falseのlinkがある場合', () => {
      it('broken linkを含むチェーンでcomplete=falseが返ること', async () => {
        // Arrange
        const { sut, builder } = createSut();
        const origin = createPath('scripts/harness/traceability-model/domain/value-objects/story-id.ts');
        builder.build.mockResolvedValue(createTraceabilityChain(true));

        // Act
        const actual = await sut.execute(origin);

        // Assert
        expect(actual.complete).toBe(false);
        expect(actual.brokenLinks.length).toBeGreaterThan(0);
      });
    });

    // IT-TM-020
    context('builder.buildがProjectRelativePathErrorを送出する場合', () => {
      it('起点ファイル不正時にTraceabilityChainBuildErrorが発生すること', async () => {
        // Arrange
        const { sut, builder } = createSut();
        builder.build.mockRejectedValue(
          new Error('ProjectRelativePathError: invalid origin'),
        );

        // Act
        const actual = sut.execute('/tmp/story-id.ts');

        // Assert
        await expect(actual).rejects.toThrow(TraceabilityChainBuildError);
      });
    });
  });
});
