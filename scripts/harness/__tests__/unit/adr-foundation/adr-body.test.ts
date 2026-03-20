import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AdrBody } from '../../../adr-foundation/domain/value-objects/adr-body.js';

const createAdrBody = (
  overrides?: Partial<{
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string;
  }>,
): AdrBody =>
  AdrBody.create({
    context: overrides?.context ?? '背景',
    decision: overrides?.decision ?? '判断',
    consequences: overrides?.consequences ?? '結果',
    alternatives: overrides?.alternatives,
  });

target('AdrBody', () => {
  target('create', () => {
    // UT-AF-080
    context('必須セクションが揃っている場合', () => {
      it('本文が生成されること', () => {
        // Arrange
        const input = {
          context: '背景',
          decision: '判断',
          consequences: '結果',
        };

        // Act
        const actual = AdrBody.create(input);

        // Assert
        expect(actual.context).toBe('背景');
        expect(actual.decision).toBe('判断');
        expect(actual.consequences).toBe('結果');
      });
    });

    // UT-AF-084
    context('alternativesを省略する場合', () => {
      it('alternativesはundefinedになること', () => {
        // Arrange
        const input = {
          context: '背景',
          decision: '判断',
          consequences: '結果',
        };

        // Act
        const actual = AdrBody.create(input);

        // Assert
        expect(actual.alternatives).toBeUndefined();
      });
    });

  });

  target('withAlternatives', () => {
    // UT-AF-086
    context('代替案を更新する場合', () => {
      it('新しい代替案を持つインスタンスが返ること', () => {
        // Arrange
        const sut = createAdrBody();

        // Act
        const actual = sut.withAlternatives('案B');

        // Assert
        expect(actual.alternatives).toBe('案B');
      });
    });

    // UT-AF-087
    context('代替案を削除する場合', () => {
      it('代替案がundefinedのインスタンスが返ること', () => {
        // Arrange
        const sut = createAdrBody({ alternatives: '案A' });

        // Act
        const actual = sut.withAlternatives(undefined);

        // Assert
        expect(actual.alternatives).toBeUndefined();
      });
    });
  });

  target('toSectionMap', () => {
    // UT-AF-088
    context('全セクションを保持している場合', () => {
      it('Markdownセクション名をキーにしたマップを返すこと', () => {
        // Arrange
        const sut = createAdrBody({ alternatives: '案A' });

        // Act
        const actual = sut.toSectionMap();

        // Assert
        expect(actual).toEqual({
          Context: '背景',
          Decision: '判断',
          Consequences: '結果',
          Alternatives: '案A',
        });
      });
    });
  });

  target('equals', () => {
    // UT-AF-089
    context('同じ内容の本文を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrBody({ alternatives: '案A' });
        const other = createAdrBody({ alternatives: '案A' });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
