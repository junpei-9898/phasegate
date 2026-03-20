// @unit agent-integration
// @layer domain
// @story H11-01

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FallbackVerificationService } from '../../../agent-integration/domain/services/fallback-verification-service.js';
import { AgentApiImportViolationError, CommandNotRegisteredViolationError } from '../../../agent-integration/domain/services/fallback-verification-service.js';
import { createFallbackCapabilitySpec } from '../../helpers/test-helpers.js';

/** ポートモックビルダー */
const buildVerificationPorts = (overrides: {
  detectedImports?: string[];
  registeredCommands?: string[];
} = {}) => {
  const { detectedImports = [], registeredCommands = ['harness:lint', 'harness:complete-check'] } = overrides;

  const importAnalyzerPort = {
    detectAgentApiImports: vi.fn().mockReturnValue(detectedImports),
  };
  const cliCommandRegistryPort = {
    has: vi.fn((cmd: string) => registeredCommands.includes(cmd)),
  };

  return { importAnalyzerPort, cliCommandRegistryPort };
};

target('FallbackVerificationService', () => {
  target('verify()', () => {
    describe('正常系でviolationsなしを返す', () => {
      // UT-FVS-001
      it('エージェントAPIのimportなし・全コマンド登録済みのとき violations=[] を返すこと', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: [], registeredCommands: ['harness:lint'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: true });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(0);
      });

      // UT-FVS-002
      it('noAgentApiImports=falseのとき importチェックをスキップし violations=[] を返すこと', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: ['@anthropic-ai/claude-code'], registeredCommands: ['harness:lint'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: false });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    describe('importチェックのviolationを検出する', () => {
      // UT-FVS-010
      it('@anthropic-ai/claude-codeのimportを検出したとき violations に1件以上含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: ['module-a:@anthropic-ai/claude-code'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ noAgentApiImports: true });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual[0]).toBeInstanceOf(AgentApiImportViolationError);
      });

      // UT-FVS-011
      it('複数モジュールでエージェントAPI使用時にモジュールごとに violations が追加されること', () => {
        // Arrange
        const ports = buildVerificationPorts({
          detectedImports: ['module-a:@anthropic-ai/claude-code', 'module-b:@anthropic-ai/claude-code'],
        });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ noAgentApiImports: true });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(2);
      });

      // UT-FVS-012 / UT-BV-014
      it('noAgentApiImports=falseのとき importチェックがスキップされ violations=[] であること', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: ['module-a:@anthropic-ai/claude-code'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ noAgentApiImports: false });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    describe('commandName存在確認のviolationを検出する', () => {
      // UT-FVS-020
      it('harness:unknownが未登録のとき violations に1件のHarnessErrorが含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({ registeredCommands: ['harness:lint'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({
          supportedCommands: ['harness:lint', 'harness:unknown'],
          noAgentApiImports: false,
        });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]).toBeInstanceOf(CommandNotRegisteredViolationError);
      });

      // UT-FVS-021
      it('全コマンド未登録のとき violations に2件のHarnessErrorが含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({ registeredCommands: [] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({
          supportedCommands: ['harness:lint', 'harness:complete-check'],
          noAgentApiImports: false,
        });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(2);
      });
    });

    describe('複合violationを検出する', () => {
      // UT-FVS-030
      it('importあり・コマンド未登録のとき複数種別の violations が含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({
          detectedImports: ['module-a:@anthropic-ai/claude-code'],
          registeredCommands: [],
        });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({
          supportedCommands: ['harness:unknown'],
          noAgentApiImports: true,
        });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(2);
        // importエラーとcommandエラーの両方が含まれる
        expect(actual.every((v) => v instanceof Error)).toBe(true);
      });
    });
  });
});
