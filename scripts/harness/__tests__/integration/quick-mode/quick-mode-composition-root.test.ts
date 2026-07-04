// @layer test
// @unit quick-mode
// @work-item-id WI-140
import { describe, expect, it, vi, afterEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { createQuickModeCompositionRoot } from '../../../quick-mode/composition-root.js';
import { ValidatorSystemQuickModeExecutionAdapter } from '../../../quick-mode/infrastructure/adapters/validator-system-quick-mode-execution-adapter.js';

target('createQuickModeCompositionRoot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ci-check --quick のバリデータ配線 (no-op 回帰)', () => {
    context('eligible=true かつ dryRun=false で executeUseCase を実行した場合', () => {
      it('ValidatorExecutionPort.executeWithProfile が緩和プロファイルで1回呼ばれること', async () => {
        // Arrange: 実際のバリデータ実行を避けるため adapter の実行メソッドをスパイ化。
        // 以前は composition root が validatorExecutionPort を注入しておらず、
        // --quick は緩和プロファイルを生成するだけで何も実行しない no-op だった。
        const executeSpy = vi
          .spyOn(ValidatorSystemQuickModeExecutionAdapter.prototype, 'executeWithProfile')
          .mockResolvedValue(undefined);
        const mod = createQuickModeCompositionRoot();

        // Act: docs のみの変更 = quick mode 適格
        const decision = await mod.executeUseCase.execute({
          changedFiles: [{ filePath: 'docs/readme.md', changeKind: 'MODIFY' }],
          dryRun: false,
        });

        // Assert
        expect(decision.eligibility.eligible).toBe(true);
        expect(decision.relaxationProfile).toBeDefined();
        expect(executeSpy).toHaveBeenCalledTimes(1);
        expect(executeSpy).toHaveBeenCalledWith(decision.relaxationProfile);
      });
    });

    context('dryRun=true の場合', () => {
      it('executeWithProfile が呼ばれないこと（緩和プロファイルは生成される）', async () => {
        // Arrange
        const executeSpy = vi
          .spyOn(ValidatorSystemQuickModeExecutionAdapter.prototype, 'executeWithProfile')
          .mockResolvedValue(undefined);
        const mod = createQuickModeCompositionRoot();

        // Act
        const decision = await mod.executeUseCase.execute({
          changedFiles: [{ filePath: 'docs/readme.md', changeKind: 'MODIFY' }],
          dryRun: true,
        });

        // Assert
        expect(decision.relaxationProfile).toBeDefined();
        expect(executeSpy).not.toHaveBeenCalled();
      });
    });
  });
});
