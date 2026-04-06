// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ChainLink } from '../../../traceability-model/domain/value-objects/chain-link.ts';

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
    from: ReturnType<typeof createPath> | null;
    to: ReturnType<typeof createPath> | null;
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

target('ChainLink.create', () => {
  describe('チェーンリンクを生成する', () => {
    // UT-TM-057
    context('正規linkTypeを渡す場合', () => {
      it('各正規linkTypeでChainLinkが生成できること', () => {
        // Arrange
        const inputs = Object.freeze([
          Object.freeze({
            from: createPath('scripts/harness/domain/story-id.ts'),
            to: createPath('docs/product/construction/traceability-model'),
            linkType: 'implementation-to-unit' as const,
            resolved: true,
          }),
          Object.freeze({
            from: createPath('docs/product/construction/traceability-model'),
            to: createPath('docs/product/construction/traceability-model/domain_model.md'),
            linkType: 'unit-to-design' as const,
            resolved: true,
          }),
          Object.freeze({
            from: createPath('docs/product/construction/traceability-model/domain_model.md'),
            to: createPath('docs/product/user_stories.md'),
            linkType: 'design-to-story' as const,
            resolved: true,
          }),
          Object.freeze({
            from: createPath('docs/product/user_stories.md'),
            to: createPath('inception/traceability-model/H03-01/unit_test_logic_plan.md'),
            linkType: 'story-to-plan' as const,
            resolved: true,
          }),
        ]);

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
          ChainLink.create(
            Object.freeze({
              from: createPath('scripts/harness/domain/story-id.ts'),
              to: createPath('docs/product/construction/traceability-model'),
              linkType: 'implementation-to-document' as 'implementation-to-unit',
              resolved: true,
            }),
          );

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
          ChainLink.create(
            Object.freeze({
              from: null,
              to: createPath('docs/product/construction/traceability-model'),
              linkType: 'implementation-to-unit' as const,
              resolved: false,
            }),
          );

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
