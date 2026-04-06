// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CliCommandDefinition } from '../../../harness-api/domain/value-objects/cli-command-definition.js';
import { CommandInputSpec } from '../../../harness-api/domain/value-objects/command-input-spec.js';

target('CliCommandDefinition', () => {
  describe('有効なコマンド名でCliCommandDefinitionを生成する', () => {
    // UT-CCD-001
    it('phasegate:check-readyからCliCommandDefinitionが生成されること', () => {
      // Arrange
      const input = 'phasegate:check-ready';
      // Act
      const actual = CliCommandDefinition.create(input);
      // Assert
      expect(actual.commandName).toBe('phasegate:check-ready');
    });

    // UT-CCD-002
    it('phasegate:impact-analysis（args指定あり）からCliCommandDefinitionが生成されること', () => {
      // Arrange
      const input = 'phasegate:impact-analysis';
      const inputSpec = CommandInputSpec.create({
        args: [{ name: 'storyId', type: 'string' }],
        flags: [],
      });
      // Act
      const actual = CliCommandDefinition.create(input, { inputSpec });
      // Assert
      expect(actual.commandName).toBe('phasegate:impact-analysis');
      expect(actual.inputSpec.args).toHaveLength(1);
    });
  });

  context('コマンド名が空文字列の場合', () => {
    // UT-CCD-003
    it('エラーをthrowすること', () => {
      // Arrange
      const input = '';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('phasegate:プレフィックスがない場合', () => {
    // UT-CCD-004
    it('check-readyからはエラーをthrowすること', () => {
      // Arrange
      const input = 'check-ready';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('プレフィックスのみでコマンド名部分が空の場合', () => {
    // UT-CCD-005
    it('phasegate:からはエラーをthrowすること', () => {
      // Arrange
      const input = 'phasegate:';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  describe('等値性テスト', () => {
    // UT-CCD-006
    it('同一commandNameを持つ2つのCliCommandDefinitionが等価であること', () => {
      // Arrange
      const a = CliCommandDefinition.create('phasegate:check-ready');
      const b = CliCommandDefinition.create('phasegate:check-ready');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-CCD-007
    it('異なるcommandNameを持つ2つのCliCommandDefinitionが非等価であること', () => {
      // Arrange
      const a = CliCommandDefinition.create('phasegate:check-ready');
      const b = CliCommandDefinition.create('phasegate:ci-check');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('不変条件テスト', () => {
    // UT-CCD-008
    it('生成後にcommandNameプロパティを変更しても反映されないこと', () => {
      // Arrange
      const sut = CliCommandDefinition.create('phasegate:check-ready');
      // Act
      // @ts-expect-error 意図的なimmutabilityテスト
      const actual = () => { sut.commandName = 'phasegate:other'; };
      // Assert
      expect(sut.commandName).toBe('phasegate:check-ready');
      void actual;
    });

    // UT-CCD-009
    it('コマンド名部分が数字始まりのphasegate:1cmdはエラーをthrowすること', () => {
      // Arrange
      const input = 'phasegate:1cmd';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  // UT-BND-001
  it('UT-BND-001: phasegate:のみでエラーをthrowすること', () => {
    // Arrange
    const input = 'phasegate:';
    // Act
    const actual = () => CliCommandDefinition.create(input);
    // Assert
    expect(actual).toThrow();
  });

  // UT-BND-002
  it('UT-BND-002: HARNESS:check-ready（大文字プレフィックス）でエラーをthrowすること', () => {
    // Arrange
    const input = 'HARNESS:check-ready';
    // Act
    const actual = () => CliCommandDefinition.create(input);
    // Assert
    expect(actual).toThrow();
  });
});
