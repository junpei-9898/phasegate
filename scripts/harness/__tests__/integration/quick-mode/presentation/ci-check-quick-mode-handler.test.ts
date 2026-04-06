// @layer test
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CiCheckQuickModeHandler } from '../../../../quick-mode/presentation/handlers/ci-check-quick-mode-handler.js';

function createApprovedDecision() {
  return {
    eligibility: {
      eligible: true,
      reason: 'すべてのファイルが許可カテゴリ内です',
    },
    relaxationProfile: {
      levelDependencyRelaxed: false,
      l1: { all: true },
      l2: {
        maintained: ['L2-002', 'L2-003'],
        skipped: ['L2-001'],
      },
      l3: {
        maintained: ['L3-001'],
        skipped: ['L3-002', 'L3-003', 'L3-004'],
      },
      l4: { all: false },
      phaseExecution: { twoPhaseRequired: false },
    },
  };
}

function createRejectedDecision(rule = 'MIXED_CHANGES') {
  return {
    eligibility: {
      eligible: false,
      reason: `${rule} ルールにより拒否されました`,
      rejectionRule: rule,
      rejectedFiles: [{ filePath: 'src/domain/vo.ts', changeKind: 'MODIFY' }],
    },
    relaxationProfile: undefined,
  };
}

target('CiCheckQuickModeHandler', () => {
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };
  // biome-ignore lint/suspicious/noExplicitAny: spy types are complex overloads
  let exitSpy: any;
  // biome-ignore lint/suspicious/noExplicitAny: spy types are complex overloads
  let stdoutSpy: any;

  beforeEach(() => {
    mockUseCase = { execute: vi.fn() };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('フラグ解釈・終了コードテスト', () => {
    context('--fail-on-reject未指定・eligible=falseの場合', () => {
      // IT-API-Handler-001
      it('終了コード0で正常終了する', async () => {
        // Arrange
        mockUseCase.execute.mockResolvedValue({
          eligibility: { eligible: false, reason: '拒否', rejectionRule: 'MIXED_CHANGES', rejectedFiles: [] },
          relaxationProfile: undefined,
        });
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: false, dryRun: false }))
          .resolves.not.toThrow();
        expect(exitSpy).not.toHaveBeenCalledWith(1);
      });
    });

    context('--fail-on-reject指定・eligible=falseの場合', () => {
      // IT-API-Handler-002
      it('終了コード1で終了する', async () => {
        // Arrange
        mockUseCase.execute.mockResolvedValue({
          eligibility: { eligible: false, reason: '拒否', rejectionRule: 'MIXED_CHANGES', rejectedFiles: [] },
          relaxationProfile: undefined,
        });
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: true, dryRun: false }))
          .rejects.toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });

    context('--fail-on-reject指定・eligible=trueの場合', () => {
      // IT-API-Handler-003
      it('終了コード0で正常終了する', async () => {
        // Arrange
        mockUseCase.execute.mockResolvedValue(createApprovedDecision());
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: true, dryRun: false }))
          .resolves.not.toThrow();
        expect(exitSpy).not.toHaveBeenCalledWith(1);
      });
    });

    context('UseCaseが例外をスローした場合', () => {
      // IT-API-Handler-004
      it('終了コード2で終了する', async () => {
        // Arrange
        mockUseCase.execute.mockRejectedValue(new Error('unexpected'));
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: false, dryRun: false }))
          .rejects.toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('--dry-runフラグ', () => {
    // IT-API-Handler-005
    it('--dry-run指定時、usecase.executeが{ dryRun: true }で呼ばれる', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: true });
      // Assert
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true }),
      );
    });

    // IT-API-Handler-006
    it('--dry-run未指定時、usecase.executeが{ dryRun: false }または{ dryRun: undefined }で呼ばれる', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false });
      // Assert
      const callArgs = mockUseCase.execute.mock.calls[0][0];
      expect(callArgs.dryRun === false || callArgs.dryRun === undefined).toBe(true);
    });
  });

  describe('--filesフラグ', () => {
    // IT-API-Handler-007
    it('--files指定時、usecase.executeのchangedFilesに指定ファイルが渡される', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      // Act
      await handler.handle({
        quick: true,
        failOnReject: false,
        dryRun: false,
        files: 'src/a.ts,src/b.ts',
      });
      // Assert
      const callArgs = mockUseCase.execute.mock.calls[0][0];
      expect(callArgs.changedFiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ filePath: 'src/a.ts' }),
          expect.objectContaining({ filePath: 'src/b.ts' }),
        ]),
      );
    });

    // IT-API-Handler-008
    it('--files未指定時、usecase.executeのchangedFilesがundefinedである', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false });
      // Assert
      const callArgs = mockUseCase.execute.mock.calls[0][0];
      expect(callArgs.changedFiles).toBeUndefined();
    });
  });

  describe('--formatフラグ', () => {
    // IT-API-Handler-009
    it('--format human指定時、stdoutが人間可読形式（"Quick Mode 判定"を含む）で出力される', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'human' });
      // Assert
      const output = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toContain('Quick Mode 判定');
      expect(output).toContain('承認');
    });

    // IT-API-Handler-010
    it('--format json指定・eligible=false時、stdoutがJSONパース可能でeligible: falseを含む', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createRejectedDecision('MIXED_CHANGES'));
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'json' });
      // Assert
      const output = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
      const parsed = JSON.parse(output);
      expect(parsed.eligibility.eligible).toBe(false);
    });

    // IT-API-Handler-011
    it('--format agent指定時、stdoutにrejectedFilesの詳細が含まれる', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue({
        eligibility: {
          eligible: false,
          reason: '拒否',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'src/domain/vo.ts', changeKind: 'MODIFY' }],
        },
        relaxationProfile: undefined,
      });
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'agent' });
      // Assert
      const output = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toContain('src/domain/vo.ts');
    });

    // IT-API-Handler-012
    it('--format未指定時、デフォルトのhuman形式でstdoutに出力される（--format humanと同等）', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase as never });
      const stdoutCaptureDefault: string[] = [];
      const stdoutCaptureHuman: string[] = [];
      stdoutSpy.mockImplementation(((chunk: string) => {
        stdoutCaptureDefault.push(chunk);
        return true;
      }) as never);
      // Act (format未指定)
      await handler.handle({ quick: true, failOnReject: false, dryRun: false });
      stdoutSpy.mockReset();
      stdoutSpy.mockImplementation(((chunk: string) => {
        stdoutCaptureHuman.push(chunk);
        return true;
      }) as never);
      // Act (format=human)
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'human' });
      // Assert
      expect(stdoutCaptureDefault.join('')).toEqual(stdoutCaptureHuman.join(''));
    });
  });
});
