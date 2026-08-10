// @layer test
// @unit quick-mode
// @story H10-01
// @work-item-id WI-390
import { describe, expect, it, vi } from 'vitest';
import { target, context, createChangedFile, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { JudgeQuickModeEligibilityUseCase } from '../../../../../quick-mode/application/usecases/judge-quick-mode-eligibility-usecase.js';
import type { ChangedFilesPort } from '../../../../../quick-mode/application/ports/changed-files-port.js';
import type { QuickModeConfigPort } from '../../../../../quick-mode/application/ports/quick-mode-config-port.js';

const buildSut = (overrides?: {
  changedFiles?: ReturnType<typeof vi.fn>;
  getConfig?: ReturnType<typeof vi.fn>;
}) => {
  const changedFilesPort: ChangedFilesPort = {
    getChangedFiles: overrides?.changedFiles ?? vi.fn().mockResolvedValue([createChangedFile()]),
  };
  const quickModeConfigPort: QuickModeConfigPort = {
    getConfig: overrides?.getConfig ?? vi.fn().mockResolvedValue(createQuickModeConfig()),
  };
  const sut = new JudgeQuickModeEligibilityUseCase({ changedFilesPort, quickModeConfigPort });
  return { sut, changedFilesPort, quickModeConfigPort };
};

target('JudgeQuickModeEligibilityUseCase', () => {
  target('execute', () => {
    describe('変更ファイルの自動取得から適用可否判定まで実行する', () => {
      // UT-JUC-001
      it('changedFilesを省略した場合にChangedFilesPortから変更ファイルを取得してQuickModeEligibilityContractを返すこと', async () => {
        // Arrange
        const { sut, changedFilesPort } = buildSut();
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(changedFilesPort.getChangedFiles).toHaveBeenCalledOnce();
        expect(actual).toHaveProperty('eligible');
      });

      // UT-JUC-002
      it('明示的なchangedFiles配列が渡された場合に渡されたファイルを使用してQuickModeEligibilityContractを返すこと（PortのgetChangedFilesが呼ばれないこと）', async () => {
        // Arrange
        const { sut, changedFilesPort } = buildSut();
        const files = [createChangedFile()];
        // Act
        const actual = await sut.execute({ changedFiles: files });
        // Assert
        expect(changedFilesPort.getChangedFiles).not.toHaveBeenCalled();
        expect(actual).toHaveProperty('eligible');
      });

      // UT-JUC-003
      it('全ファイルがallowedCategories内のみの場合にeligible=trueのcontractが返ること', async () => {
        // Arrange
        const allowedFile = createChangedFile(
          'scripts/harness/quick-mode/services/quick-service.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([allowedFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(true);
      });
    });

    describe('3拒否ルール別', () => {
      // UT-JUC-004
      it("単一の不許可カテゴリはCATEGORY_NOT_ALLOWEDのcontractを返すこと", async () => {
        // Arrange
        const domainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([domainFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('CATEGORY_NOT_ALLOWED');
      });

      // UT-JUC-005
      it("NEW_DOMAINルールに該当するファイルが含まれる場合にeligible=false、rejectionRule='NEW_DOMAIN'のcontractが返ること", async () => {
        // Arrange
        const newDomainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
          'CREATE'
        );
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain'],
        });
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([newDomainFile]),
          getConfig: vi.fn().mockResolvedValue(config),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
      });

      // UT-JUC-006
      it("API_CONTRACTルールに該当するファイルが含まれる場合にeligible=false、rejectionRule='API_CONTRACT'のcontractが返ること", async () => {
        // Arrange
        const portFile = createChangedFile(
          'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
          'MODIFY'
        );
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'api'],
        });
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([portFile]),
          getConfig: vi.fn().mockResolvedValue(config),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('API_CONTRACT');
      });
    });

    describe('異常系', () => {
      // UT-JUC-007
      it('不明なchangeKindを持つファイルが明示指定された場合にUnknownChangeCategoryError相当のエラーが発生すること', async () => {
        // Arrange
        const { sut } = buildSut();
        const invalidFile = { filePath: 'some/path.ts', changeKind: 'RENAME' };
        // Act
        const actual = sut.execute({ changedFiles: [invalidFile as never] });
        // Assert
        await expect(actual).rejects.toThrow();
      });

      // UT-JUC-008
      it('QuickModeConfigPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          getConfig: vi.fn().mockRejectedValue(new Error('config load error')),
        });
        // Act
        const actual = sut.execute({});
        // Assert
        await expect(actual).rejects.toThrow('config load error');
      });

      // UT-JUC-009
      it('ChangedFilesPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          changedFiles: vi.fn().mockRejectedValue(new Error('git error')),
        });
        // Act
        const actual = sut.execute({});
        // Assert
        await expect(actual).rejects.toThrow('git error');
      });
    });

    describe('出力形式確認', () => {
      // UT-JUC-010
      it('eligible=trueの場合に返り値のrejectionRuleがundefinedであること', async () => {
        // Arrange
        const allowedFile = createChangedFile(
          'scripts/harness/quick-mode/services/quick-service.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([allowedFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.rejectionRule).toBeUndefined();
      });

      // UT-JUC-011
      it('eligible=trueの場合に返り値のrejectedFilesがundefinedであること', async () => {
        // Arrange
        const allowedFile = createChangedFile(
          'scripts/harness/quick-mode/services/quick-service.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([allowedFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.rejectedFiles).toBeUndefined();
      });

      // UT-JUC-012
      it('eligible=falseの場合に返り値のrejectedFilesに1件以上のファイルが含まれること', async () => {
        // Arrange
        const domainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([domainFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.rejectedFiles).toBeDefined();
        expect(actual.rejectedFiles!.length).toBeGreaterThanOrEqual(1);
      });

      // UT-JUC-013
      it('eligible=falseの場合に返り値のreasonが空文字でないこと', async () => {
        // Arrange
        const domainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([domainFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.reason).toBeTruthy();
      });

      // UT-JUC-014
      it('返り値のObject.freeze()が適用されている場合にcontractオブジェクトが凍結されていること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
