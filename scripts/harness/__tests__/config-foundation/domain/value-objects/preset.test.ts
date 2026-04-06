// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { Preset } from '../../../../config-foundation/domain/value-objects/preset.js';
import { InvalidPresetError } from '../../../../config-foundation/domain/errors/invalid-preset-error.js';

target('Preset', () => {
  describe('生成する', () => {
    context('minimalを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const raw = 'minimal';

        // Act
        const actual = new Preset(raw);

        // Assert
        expect(actual.value).toBe('minimal');
      });
    });

    context('standardを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const raw = 'standard';

        // Act
        const actual = new Preset(raw);

        // Assert
        expect(actual.value).toBe('standard');
      });
    });

    context('strictを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const raw = 'strict';

        // Act
        const actual = new Preset(raw);

        // Assert
        expect(actual.value).toBe('strict');
      });
    });

    context('空文字を渡す場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const raw = '';

        // Act
        const actual = () => new Preset(raw);

        // Assert
        expect(actual).toThrow(InvalidPresetError);
        expect(actual).toThrow('L1-002');
      });
    });

    context('未知の文字列を渡す場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const raw = 'custom';

        // Act
        const actual = () => new Preset(raw);

        // Assert
        expect(actual).toThrow(InvalidPresetError);
        expect(actual).toThrow('L1-002');
      });
    });
  });

  describe('等値性を判定する', () => {
    context('同じ値を比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new Preset('minimal');
        const right = new Preset('minimal');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('異なる値を比較する場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new Preset('minimal');
        const right = new Preset('strict');

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('種別を判定する', () => {
    context('minimalの場合', () => {
      it('isMinimalがtrueを返す', () => {
        // Arrange
        const preset = new Preset('minimal');

        // Act
        const actual = preset.isMinimal();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('minimal以外の場合', () => {
      it('isMinimalがfalseを返す', () => {
        // Arrange
        const preset = new Preset('standard');

        // Act
        const actual = preset.isMinimal();

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('standardの場合', () => {
      it('isStandardがtrueを返す', () => {
        // Arrange
        const preset = new Preset('standard');

        // Act
        const actual = preset.isStandard();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('strictの場合', () => {
      it('isStrictがtrueを返す', () => {
        // Arrange
        const preset = new Preset('strict');

        // Act
        const actual = preset.isStrict();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
