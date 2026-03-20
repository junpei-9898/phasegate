import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { ProjectConfig } from '../../../../config-foundation/domain/value-objects/project-config.js';
import { Preset } from '../../../../config-foundation/domain/value-objects/preset.js';
import { InvalidPresetError } from '../../../../config-foundation/domain/errors/invalid-preset-error.js';
import { ConfigValidationError } from '../../../../config-foundation/domain/errors/config-validation-error.js';

target('ProjectConfig', () => {
  describe('生成する', () => {
    context('有効なnameとPresetを渡す場合', () => {
      it('生成できる', () => {
        // Arrange
        const name = 'my-project';
        const preset = new Preset('standard');

        // Act
        const actual = new ProjectConfig({ name, preset });

        // Assert
        expect(actual.name).toBe('my-project');
        expect(actual.preset.equals(preset)).toBe(true);
      });
    });

    context('nameが空文字の場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const name = '';
        const preset = new Preset('standard');

        // Act
        const actual = () => new ProjectConfig({ name, preset });

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('無効なPreset値を渡す場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const name = 'my-project';

        // Act
        const actual = () => ProjectConfig.create({ name, preset: 'invalid' });

        // Assert
        expect(actual).toThrow(InvalidPresetError);
        expect(actual).toThrow('L1-002');
      });
    });
  });

  describe('等値性を判定する', () => {
    context('同じnameとpresetを比較する場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new ProjectConfig({ name: 'proj', preset: new Preset('minimal') });
        const right = new ProjectConfig({ name: 'proj', preset: new Preset('minimal') });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('nameだけ異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new ProjectConfig({ name: 'proj-a', preset: new Preset('minimal') });
        const right = new ProjectConfig({ name: 'proj-b', preset: new Preset('minimal') });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('presetだけ異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new ProjectConfig({ name: 'proj', preset: new Preset('minimal') });
        const right = new ProjectConfig({ name: 'proj', preset: new Preset('strict') });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('名前とPresetを変更する', () => {
    context('renameを呼ぶ場合', () => {
      it('新しいnameの新インスタンスを返す', () => {
        // Arrange
        const projectConfig = new ProjectConfig({ name: 'old-project', preset: new Preset('standard') });

        // Act
        const actual = projectConfig.rename('next-project');

        // Assert
        expect(actual.name).toBe('next-project');
        expect(actual).not.toBe(projectConfig);
        expect(actual.preset.equals(projectConfig.preset)).toBe(true);
      });
    });

    context('changePresetを呼ぶ場合', () => {
      it('新しいPresetの新インスタンスを返す', () => {
        // Arrange
        const projectConfig = new ProjectConfig({ name: 'my-project', preset: new Preset('minimal') });
        const nextPreset = new Preset('strict');

        // Act
        const actual = projectConfig.changePreset(nextPreset);

        // Assert
        expect(actual.preset.equals(nextPreset)).toBe(true);
        expect(actual).not.toBe(projectConfig);
        expect(actual.name).toBe('my-project');
      });
    });
  });
});
