// @layer test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { JudgeQuickModeEligibilityUseCase } from '../../../../quick-mode/application/usecases/judge-quick-mode-eligibility-usecase.js';
import { QuickModeConfig } from '../../../../quick-mode/domain/value-objects/quick-mode-config.js';
import { QuickModeJudgmentEngine } from '../../../../quick-mode/domain/services/quick-mode-judgment-engine.js';

function createDefaultQuickModeConfig() {
  return QuickModeConfig.create({
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L3-001'],
    relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
  });
}

target('JudgeQuickModeEligibilityUseCase', () => {
  describe('allowedCategoriesのみのファイル変更でeligible=trueが返る', () => {
    context('changedFilesPortからファイルを取得する場合', () => {
      // IT-UC-Judge-001
      it('bugfix相当のMODIFYファイルでeligible=trueが返る', async () => {
        // Arrange
        const mockChangedFilesPort = {
          getChangedFiles: vi.fn().mockResolvedValue([
            { filePath: 'src/foo.ts', changeKind: 'MODIFY' },
          ]),
        };
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: mockChangedFilesPort as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({ changedFiles: undefined });
        // Assert
        expect(actual.eligible).toBe(true);
        expect(actual.reason).toBeTruthy();
      });
    });

    context('changedFilesを明示指定する場合', () => {
      // IT-UC-Judge-002
      it('changedFilesを明示指定したとき、ポートを呼ばずに入力値で判定する', async () => {
        // Arrange
        const mockChangedFilesPort = {
          getChangedFiles: vi.fn(),
        };
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: mockChangedFilesPort as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({
          changedFiles: [{ filePath: 'docs/README.md', changeKind: 'MODIFY' }],
        });
        // Assert
        expect(actual.eligible).toBe(true);
        expect(mockChangedFilesPort.getChangedFiles).not.toHaveBeenCalled();
      });

      // IT-UC-Judge-003
      it('テストファイルのみの変更でeligible=trueが返る', async () => {
        // Arrange
        const mockChangedFilesPort = {
          getChangedFiles: vi.fn().mockResolvedValue([
            { filePath: 'src/foo.test.ts', changeKind: 'MODIFY' },
          ]),
        };
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: mockChangedFilesPort as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({ changedFiles: undefined });
        // Assert
        expect(actual.eligible).toBe(true);
      });

      // IT-UC-Judge-004
      it('空のchangedFilesリストでeligible=trueが返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() } as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({ changedFiles: [] });
        // Assert
        expect(actual.eligible).toBe(true);
      });
    });
  });

  describe('3拒否ルールによる異常系', () => {
    context('domain/配下のMODIFYファイルが含まれる場合', () => {
      // IT-UC-Judge-005
      it('MIXED_CHANGES拒否が返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() } as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({
          changedFiles: [{
            filePath: 'scripts/harness/quick-mode/domain/value-objects/changed-file.ts',
            changeKind: 'MODIFY',
          }],
        });
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
        expect(actual.rejectedFiles!.length).toBeGreaterThanOrEqual(1);
      });

      // IT-UC-Judge-006
      it('domain/配下のCREATEファイルはMIXED_CHANGESが先に検出される', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() } as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({
          changedFiles: [{
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }],
        });
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // IT-UC-Judge-007
      it('port.tsファイルの変更でMIXED_CHANGESまたはAPI_CONTRACT拒否が返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() } as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({
          changedFiles: [{
            filePath: 'scripts/harness/quick-mode/domain/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }],
        });
        // Assert
        expect(actual.eligible).toBe(false);
        expect(['MIXED_CHANGES', 'API_CONTRACT']).toContain(actual.rejectionRule);
        expect(actual.rejectedFiles!.length).toBeGreaterThanOrEqual(1);
      });

      // IT-UC-Judge-008
      it('allowedCategories内ファイルとdomain/配下ファイルが混在するとMIXED_CHANGES拒否が返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() } as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({
          changedFiles: [
            { filePath: 'docs/README.md', changeKind: 'MODIFY' },
            { filePath: 'scripts/harness/quick-mode/domain/services/engine.ts', changeKind: 'MODIFY' },
          ],
        });
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // IT-UC-Judge-009
      it('bugfixとdocs混在（両方allowedCategories内）でeligible=trueが返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() } as never,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });
        // Act
        const actual = await usecase.execute({
          changedFiles: [
            { filePath: 'src/util.ts', changeKind: 'MODIFY' },
            { filePath: 'docs/guide.md', changeKind: 'MODIFY' },
          ],
        });
        // Assert
        expect(actual.eligible).toBe(true);
      });
    });
  });

  describe('Portエラーの伝播', () => {
    // IT-UC-Judge-010
    it('changedFilesPortがエラーを投げた場合、UseCaseがそのエラーを伝播する', async () => {
      // Arrange
      const mockChangedFilesPort = {
        getChangedFiles: vi.fn().mockRejectedValue(new Error('git error')),
      };
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const engine = new QuickModeJudgmentEngine();
      const usecase = new JudgeQuickModeEligibilityUseCase({
        changedFilesPort: mockChangedFilesPort as never,
        quickModeConfigPort: mockQuickModeConfigPort,
        judgmentEngine: engine,
      });
      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined })).rejects.toThrow('git error');
    });

    // IT-UC-Judge-011
    it('quickModeConfigPortがエラーを投げた場合、UseCaseがそのエラーを伝播する', async () => {
      // Arrange
      const mockChangedFilesPort = {
        getChangedFiles: vi.fn().mockResolvedValue([
          { filePath: 'src/foo.ts', changeKind: 'MODIFY' },
        ]),
      };
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockImplementation(() => {
          throw new Error('config error');
        }),
      };
      const engine = new QuickModeJudgmentEngine();
      const usecase = new JudgeQuickModeEligibilityUseCase({
        changedFilesPort: mockChangedFilesPort as never,
        quickModeConfigPort: mockQuickModeConfigPort,
        judgmentEngine: engine,
      });
      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined })).rejects.toThrow('config error');
    });
  });

  describe('出力DTO形式', () => {
    // IT-UC-Judge-012
    it('返却されるDTOがObject.freeze済みで不変であること', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const engine = new QuickModeJudgmentEngine();
      const usecase = new JudgeQuickModeEligibilityUseCase({
        changedFilesPort: { getChangedFiles: vi.fn() } as never,
        quickModeConfigPort: mockQuickModeConfigPort,
        judgmentEngine: engine,
      });
      // Act
      const actual = await usecase.execute({ changedFiles: [] });
      // Assert
      expect(Object.isFrozen(actual)).toBe(true);
    });
  });
});
