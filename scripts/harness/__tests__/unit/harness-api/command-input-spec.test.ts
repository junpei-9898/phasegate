import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { CommandInputSpec } from '../../../harness-api/domain/value-objects/command-input-spec.js';

target('CommandInputSpec', () => {
  describe('正常系: 有効な引数でCommandInputSpecを生成する', () => {
    // UT-CIS-001
    it('args=[], flags=[]でCommandInputSpecが生成されること', () => {
      // Arrange
      const input = { args: [], flags: [] };
      // Act
      const actual = CommandInputSpec.create(input);
      // Assert
      expect(actual.args).toHaveLength(0);
      expect(actual.flags).toHaveLength(0);
    });

    // UT-CIS-002
    it('args=[{name:unit, type:string}]でCommandInputSpecが生成されること', () => {
      // Arrange
      const input = { args: [{ name: 'unit', type: 'string' as const }], flags: [] };
      // Act
      const actual = CommandInputSpec.create(input);
      // Assert
      expect(actual.args[0].name).toBe('unit');
    });

    // UT-CIS-003
    it('flags=[{name:json, type:boolean}]でCommandInputSpecが生成されること', () => {
      // Arrange
      const input = { args: [], flags: [{ name: 'json', type: 'boolean' as const }] };
      // Act
      const actual = CommandInputSpec.create(input);
      // Assert
      expect(actual.flags[0].name).toBe('json');
    });
  });
});
