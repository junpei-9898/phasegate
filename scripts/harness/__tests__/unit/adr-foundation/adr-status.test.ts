// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  AdrStatus,
  InvalidAdrStatusError,
} from '../../../adr-foundation/domain/value-objects/adr-status.js';

const createAdrStatus = (value = 'Proposed'): AdrStatus => AdrStatus.create(value);

target('AdrStatus', () => {
  target('create', () => {
    // UT-AF-050, UT-AF-051, UT-AF-052, UT-AF-053
    context('有効なステータスを渡す場合', () => {
      it('対応するステータスが生成されること', () => {
        // Arrange
        const inputs = ['Proposed', 'Accepted', 'Deprecated', 'Superseded'] as const;

        // Act
        const actual = inputs.map((input) => AdrStatus.create(input));

        // Assert
        expect(actual.map((status) => status.value)).toEqual(inputs);
      });
    });

    // UT-AF-054, UT-AF-055
    context('無効なステータスを渡す場合', () => {
      it('生成に失敗すること', () => {
        // Arrange
        const inputs = ['proposed', 'Invalid'];

        // Act
        const actual = () => {
          for (const input of inputs) {
            AdrStatus.create(input);
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidAdrStatusError);
      });
    });
  });

  target('canTransitionTo', () => {
    // UT-AF-058
    context('ProposedからAcceptedへ遷移する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrStatus('Proposed');
        const nextStatus = createAdrStatus('Accepted');

        // Act
        const actual = sut.canTransitionTo(nextStatus);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-AF-059
    context('ProposedからDeprecatedへ遷移する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrStatus('Proposed');
        const nextStatus = createAdrStatus('Deprecated');

        // Act
        const actual = sut.canTransitionTo(nextStatus);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-AF-060
    context('AcceptedからSupersededへ遷移する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrStatus('Accepted');
        const nextStatus = createAdrStatus('Superseded');

        // Act
        const actual = sut.canTransitionTo(nextStatus);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-AF-061
    context('許可されていない遷移を確認する場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createAdrStatus('Proposed');
        const nextStatus = createAdrStatus('Superseded');

        // Act
        const actual = sut.canTransitionTo(nextStatus);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    // UT-AF-062
    context('同じステータス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrStatus('Superseded');
        const other = createAdrStatus('Superseded');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
