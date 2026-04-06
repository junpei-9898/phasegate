// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ChainLink } from '../../../traceability-model/domain/value-objects/chain-link.ts';
import { TraceabilityChain } from '../../../traceability-model/domain/value-objects/traceability-chain.ts';

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

const createChainLink = (
  overrides: Partial<{
    from: ReturnType<typeof createPath>;
    to: ReturnType<typeof createPath>;
    linkType:
      | 'implementation-to-unit'
      | 'unit-to-design'
      | 'design-to-story'
      | 'story-to-plan';
    resolved: boolean;
  }> = {},
) =>
  ChainLink.create(
    Object.freeze({
      from: createPath('scripts/harness/domain/story-id.ts'),
      to: createPath('docs/product/construction/traceability-model'),
      linkType: 'implementation-to-unit',
      resolved: true,
      ...overrides,
    }),
  );

const createTraceabilityChain = (
  overrides: Partial<{
    origin: ReturnType<typeof createPath>;
    links: readonly ReturnType<typeof createChainLink>[];
  }> = {},
) =>
  TraceabilityChain.create(
    Object.freeze({
      origin: createPath('scripts/harness/domain/story-id.ts'),
      links: Object.freeze([
        createChainLink({
          from: createPath('scripts/harness/domain/story-id.ts'),
          to: createPath('docs/product/construction/traceability-model'),
          linkType: 'implementation-to-unit',
        }),
        createChainLink({
          from: createPath('docs/product/construction/traceability-model'),
          to: createPath(
            'docs/product/construction/traceability-model/domain_model.md',
          ),
          linkType: 'unit-to-design',
        }),
        createChainLink({
          from: createPath(
            'docs/product/construction/traceability-model/domain_model.md',
          ),
          to: createPath('docs/product/user_stories.md'),
          linkType: 'design-to-story',
        }),
        createChainLink({
          from: createPath('docs/product/user_stories.md'),
          to: createPath(
            'inception/traceability-model/H03-01/unit_test_logic_plan.md',
          ),
          linkType: 'story-to-plan',
        }),
      ]),
      ...overrides,
    }),
  );

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
          links: Object.freeze([
            createChainLink({
              from: createPath('scripts/harness/domain/story-id.ts'),
              to: createPath('docs/product/construction/traceability-model'),
              linkType: 'implementation-to-unit',
            }),
            createChainLink({
              from: createPath('docs/product/construction/traceability-model'),
              to: createPath(
                'docs/product/construction/traceability-model/domain_model.md',
              ),
              linkType: 'unit-to-design',
              resolved: false,
            }),
          ]),
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
        const sut = TraceabilityChain.create(
          Object.freeze({
            origin: createPath('scripts/harness/domain/story-id.ts'),
            links: Object.freeze([]),
          }),
        );

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
          from: createPath('docs/product/construction/traceability-model'),
          to: createPath(
            'docs/product/construction/traceability-model/domain_model.md',
          ),
          linkType: 'unit-to-design',
          resolved: false,
        });
        const sut = createTraceabilityChain({
          links: Object.freeze([createChainLink(), brokenLink]),
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
          from: createPath('docs/product/construction/traceability-model'),
          to: createPath(
            'docs/product/construction/traceability-model/domain_model.md',
          ),
          linkType: 'unit-to-design',
          resolved: false,
        });
        const sut = createTraceabilityChain({
          links: Object.freeze([resolvedLink, brokenLink]),
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
        const sut = TraceabilityChain.create(
          Object.freeze({
            origin: createPath('scripts/harness/domain/story-id.ts'),
            links: Object.freeze([]),
          }),
        );

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
          TraceabilityChain.create(
            Object.freeze({
              origin: createPath('scripts/harness/domain/other.ts'),
              links: Object.freeze([createChainLink()]),
            }),
          );

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
        const actual = TraceabilityChain.create(
          Object.freeze({
            origin: createPath('scripts/harness/domain/story-id.ts'),
            links,
          }),
        );

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
