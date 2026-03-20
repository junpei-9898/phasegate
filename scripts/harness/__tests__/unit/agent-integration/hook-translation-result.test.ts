// @unit agent-integration
// @layer domain
// @story H11-02

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HookTranslationResult, HookTranslationResultInvariantError } from '../../../agent-integration/domain/value-objects/hook-translation-result.js';
import { createHookTranslationResult } from '../../helpers/test-helpers.js';

target('HookTranslationResult', () => {
  describe('正常系で生成する', () => {
    // UT-HTR-001
    it('shouldBlock=trueのブロック結果が生成されること', () => {
      // Arrange
      const input = { shouldBlock: true, cliArgs: [], expectedExitCode: 1 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.shouldBlock).toBe(true);
      expect(actual.expectedExitCode).toBe(1);
    });

    // UT-HTR-002
    it('cliCommandとtimeoutMs指定で生成されること', () => {
      // Arrange
      const input = {
        shouldBlock: false,
        cliCommand: 'harness:lint',
        cliArgs: ['--fast'],
        expectedExitCode: 0,
        timeoutMs: 500,
      };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.cliCommand).toBe('harness:lint');
      expect(actual.timeoutMs).toBe(500);
    });

    // UT-HTR-003
    it('skipReason=HOOK_DISABLEDで生成されること', () => {
      // Arrange
      const input = { shouldBlock: false, skipReason: 'HOOK_DISABLED' as const, cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.skipReason).toBe('HOOK_DISABLED');
    });

    // UT-HTR-004
    it('skipReason=REENTRY_DETECTEDで生成されること', () => {
      // Arrange
      const input = { shouldBlock: false, skipReason: 'REENTRY_DETECTED' as const, cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.skipReason).toBe('REENTRY_DETECTED');
    });

    // UT-HTR-005
    it('timeoutMs省略時にundefinedになること', () => {
      // Arrange
      const input = { shouldBlock: false, cliCommand: 'harness:complete-check', cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.timeoutMs).toBeUndefined();
    });
  });

  context('shouldBlock=trueかつcliCommandが指定されている場合（INV-2違反）', () => {
    // UT-HTR-010 / UT-BV-005
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const input = { shouldBlock: true, cliCommand: 'harness:lint', cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = () => HookTranslationResult.create(input);
      // Assert
      expect(actual).toThrow(HookTranslationResultInvariantError);
    });

    // UT-HTR-011
    it('エラーメッセージに「shouldBlock=trueのときcliCommandは設定不可」等の識別情報が含まれること', () => {
      // Arrange
      const input = { shouldBlock: true, cliCommand: 'harness:lint', cliArgs: [], expectedExitCode: 0 };
      let caughtError: Error | undefined;
      // Act
      try {
        HookTranslationResult.create(input);
      } catch (e) {
        caughtError = e as Error;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/shouldBlock.*true.*cliCommand|cliCommand.*設定不可/);
    });
  });

  context('skipReasonがあるかつcliCommandが指定されている場合（INV-3違反）', () => {
    // UT-HTR-020 / UT-BV-006
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const input = {
        shouldBlock: false,
        skipReason: 'HOOK_DISABLED' as const,
        cliCommand: 'harness:lint',
        cliArgs: [],
        expectedExitCode: 0,
      };
      // Act
      const actual = () => HookTranslationResult.create(input);
      // Assert
      expect(actual).toThrow(HookTranslationResultInvariantError);
    });

    // UT-HTR-021
    it('エラーメッセージに「skipReasonがある場合cliCommandは設定不可」等の識別情報が含まれること', () => {
      // Arrange
      const input = {
        shouldBlock: false,
        skipReason: 'HOOK_DISABLED' as const,
        cliCommand: 'harness:lint',
        cliArgs: [],
        expectedExitCode: 0,
      };
      let caughtError: Error | undefined;
      // Act
      try {
        HookTranslationResult.create(input);
      } catch (e) {
        caughtError = e as Error;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/skipReason.*cliCommand|cliCommand.*設定不可/);
    });
  });

  describe('等値性を検証する', () => {
    // UT-HTR-030
    it('同一フィールドを持つ2つのHookTranslationResultが等値であること', () => {
      // Arrange
      const a = createHookTranslationResult({ cliCommand: 'harness:lint', cliArgs: ['--fast'], expectedExitCode: 0 });
      const b = createHookTranslationResult({ cliCommand: 'harness:lint', cliArgs: ['--fast'], expectedExitCode: 0 });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-HTR-031
    it('cliArgsの内容が異なる2つのHookTranslationResultが非等値であること', () => {
      // Arrange
      const a = createHookTranslationResult({ cliArgs: ['--fast'] });
      const b = createHookTranslationResult({ cliArgs: ['--full'] });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
