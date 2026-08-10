// @layer test
// @unit quick-mode
// @story H10-02
// @work-item-id WI-140
// @work-item-id WI-346
// @work-item-id WI-390
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { createQuickModeCompositionRoot } from '../../../quick-mode/composition-root.js';
import { ValidatorSystemQuickModeExecutionAdapter } from '../../../quick-mode/infrastructure/adapters/validator-system-quick-mode-execution-adapter.js';
import { context, target } from '../../helpers/test-helpers.js';

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

  describe('config とファイル存在確認の解決基準', () => {
    it('指定した設定ファイルで bugfix が許可されていない場合は full mode 必須と判定すること', async () => {
      // Arrange
      const rootDir = mkdtempSync(path.join(tmpdir(), 'phasegate-wi346-config-'));
      const configPath = path.join(rootDir, 'custom.config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          quickMode: {
            allowedCategories: ['docs'],
            maintainedLayers: ['L1'],
            relaxedGates: [],
          },
        }),
        'utf8',
      );
      const mod = createQuickModeCompositionRoot({ configPath, rootDir });

      // Act
      const actual = await mod.classifyUseCase.execute({
        paths: ['src/existing.ts'],
        targetChanges: [{ filePath: 'src/existing.ts' }],
      });

      // Assert
      expect(actual.dominantCategory).toBe('bugfix');
      expect(actual.fullModeRequired).toBe(true);
      expect(actual.rejectionRule).toBe('CATEGORY_NOT_ALLOWED');
    });

    it('指定した rootDir に対象ファイルが存在する場合は MODIFY として分類すること', async () => {
      // Arrange
      const rootDir = mkdtempSync(path.join(tmpdir(), 'phasegate-wi346-root-'));
      const configPath = path.join(rootDir, 'custom.config.json');
      const targetPath = 'custom-existing-source.ts';
      writeFileSync(
        configPath,
        JSON.stringify({
          quickMode: {
            allowedCategories: ['bugfix'],
            maintainedLayers: ['L1'],
            relaxedGates: [],
          },
        }),
        'utf8',
      );
      writeFileSync(path.join(rootDir, targetPath), 'export const existing = true;\n', 'utf8');
      const mod = createQuickModeCompositionRoot({ configPath, rootDir });

      // Act
      const actual = await mod.classifyUseCase.execute({ paths: [targetPath] });

      // Assert
      expect(actual.dominantCategory).toBe('bugfix');
      expect(actual.fullModeRequired).toBe(false);
    });
  });
});
