import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { DecideExitCodeUseCase } from '../../../harness-api/application/usecases/decide-exit-code-usecase.js';

target('DecideExitCodeUseCase.execute', () => {
  const useCase = new DecideExitCodeUseCase();

  // ─── IT-UC-DecideExit-001 ───
  describe("status='pass'のコマンドはexitCode=0を返すこと", () => {
    context("commandName='harness:check-ready'・status='pass'の場合", () => {
      it('exitCode=0が返される', () => {
        // Arrange
        const input = { status: 'pass' as const, commandName: 'harness:check-ready' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });
  });

  // ─── IT-UC-DecideExit-002 ───
  describe("status='fail'の通常コマンドはexitCode=1を返すこと", () => {
    context("commandName='harness:ci-check'・status='fail'の場合", () => {
      it('exitCode=1が返される', () => {
        // Arrange
        const input = { status: 'fail' as const, commandName: 'harness:ci-check' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(1);
      });
    });
  });

  // ─── IT-UC-DecideExit-003 ───
  describe("status='error'のコマンドはexitCode=2を返すこと", () => {
    context("commandName='harness:lint'・status='error'の場合", () => {
      it('exitCode=2が返される', () => {
        // Arrange
        const input = { status: 'error' as const, commandName: 'harness:lint' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });

  // ─── IT-UC-DecideExit-004 ───
  describe("D5ルール: harness:statusでstatus='fail'でもexitCode=0を返すこと", () => {
    context("commandName='harness:status'・status='fail'の場合（D5ルール適用）", () => {
      it('exitCode=0が返され、reasonにD5ルール適用の旨が含まれる', () => {
        // Arrange
        const input = { status: 'fail' as const, commandName: 'harness:status' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.reason).toMatch(/D5|status.*fail.*0|情報提供/i);
      });
    });
  });

  // ─── IT-UC-DecideExit-005 ───
  describe("D5ルール: harness:statusでstatus='pass'はexitCode=0を返すこと", () => {
    context("commandName='harness:status'・status='pass'の場合", () => {
      it('exitCode=0が返される', () => {
        // Arrange
        const input = { status: 'pass' as const, commandName: 'harness:status' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });
  });

  // ─── IT-UC-DecideExit-006 ───
  describe("D5ルール例外: harness:statusでstatus='error'はexitCode=2を返すこと", () => {
    context("commandName='harness:status'・status='error'の場合", () => {
      it('D5ルールは適用されず、exitCode=2が返される', () => {
        // Arrange
        const input = { status: 'error' as const, commandName: 'harness:status' };

        // Act
        const actual = useCase.execute(input);

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
