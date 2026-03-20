// @unit agent-integration
// @layer domain
// @story H11-01

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FallbackCapabilitySpec, FallbackCapabilityViolationError } from '../../../agent-integration/domain/value-objects/fallback-capability-spec.js';
import { createFallbackCapabilitySpec } from '../../helpers/test-helpers.js';

target('FallbackCapabilitySpec', () => {
  describe('正常系で生成する', () => {
    // UT-FCS-001
    it('supportedCommands 1件・noAgentApiImports=trueで生成されること', () => {
      // Arrange
      const input = { supportedCommands: ['harness:lint'], noAgentApiImports: true };
      // Act
      const actual = FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual).toBeInstanceOf(FallbackCapabilitySpec);
    });

    // UT-FCS-002
    it('supportedCommands 2件・noAgentApiImports=falseで生成されること', () => {
      // Arrange
      const input = { supportedCommands: ['harness:lint', 'harness:complete-check'], noAgentApiImports: false };
      // Act
      const actual = FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual.supportedCommands).toHaveLength(2);
      expect(actual.noAgentApiImports).toBe(false);
    });

    // UT-FCS-003
    it('supportedCommands 1件（最小有効）で生成されること', () => {
      // Arrange
      const input = { supportedCommands: ['harness:lint'], noAgentApiImports: true };
      // Act
      const actual = FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual.supportedCommands).toHaveLength(1);
    });
  });

  context('supportedCommandsが空配列の場合（INV-5違反）', () => {
    // UT-FCS-010 / UT-BV-003
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const input = { supportedCommands: [], noAgentApiImports: true };
      // Act
      const actual = () => FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual).toThrow(FallbackCapabilityViolationError);
    });

    // UT-FCS-011
    it('エラーメッセージに「supportedCommandsは1件以上」等の識別情報が含まれること', () => {
      // Arrange
      const input = { supportedCommands: [], noAgentApiImports: true };
      let caughtError: Error | undefined;
      // Act
      try {
        FallbackCapabilitySpec.create(input);
      } catch (e) {
        caughtError = e as Error;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/supportedCommandsは1件以上|supportedCommands.*1件/);
    });
  });

  describe('等値性を検証する', () => {
    // UT-FCS-020
    it('同一フィールドを持つ2つのFallbackCapabilitySpecが等値であること', () => {
      // Arrange
      const a = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: true });
      const b = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: true });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-FCS-021
    it('noAgentApiImportsが異なる2つのFallbackCapabilitySpecが非等値であること', () => {
      // Arrange
      const a = createFallbackCapabilitySpec({ noAgentApiImports: true });
      const b = createFallbackCapabilitySpec({ noAgentApiImports: false });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
