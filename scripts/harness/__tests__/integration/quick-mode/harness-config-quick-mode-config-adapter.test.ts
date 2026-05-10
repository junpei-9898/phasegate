// @layer test
// @unit quick-mode
// @story H10-02
// @work-item-id WI-140
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessConfigQuickModeConfigAdapter } from '../../../quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const HARNESS_CONFIG_WITH_QUICKMODE = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
  quickMode: {
    allowedCategories: ['bugfix', 'docs'],
    maintainedLayers: ['L1', 'L2-002'],
    relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
  },
});

const HARNESS_CONFIG_WITHOUT_QUICKMODE = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
});

const HARNESS_CONFIG_INVALID_DOMAIN = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
  quickMode: {
    allowedCategories: ['bugfix', 'domain'],
    maintainedLayers: ['L1'],
    relaxedGates: ['L4'],
  },
});

const HARNESS_CONFIG_EMPTY_CATEGORIES = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
  quickMode: {
    allowedCategories: [],
    maintainedLayers: ['L1'],
    relaxedGates: ['L4'],
  },
});

target('HarnessConfigQuickModeConfigAdapter', () => {
  let readFileMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readFileMock = vi.mocked(readFile);
    readFileMock.mockReset();
  });

  describe('quickModeセクションの読み取り', () => {
    context('quickModeセクションが存在する場合', () => {
      // IT-REPO-Config-001
      it('quickModeセクションの値でQuickModeConfigが生成される', async () => {
        // Arrange
        readFileMock.mockResolvedValue(HARNESS_CONFIG_WITH_QUICKMODE as never);
        const adapter = new HarnessConfigQuickModeConfigAdapter();
        // Act
        const actual = await adapter.getQuickModeConfig();
        // Assert
        expect(actual.allowedCategories).toEqual(['bugfix', 'docs']);
        expect(actual.maintainedLayers).toEqual(['L1', 'L2-002']);
      });

      // IT-REPO-Config-003
      it('quickModeセクションのallowedCategoriesが有効値のとき正常に生成される', async () => {
        // Arrange
        readFileMock.mockResolvedValue(JSON.stringify({
          project: { name: 'test', preset: 'standard' },
          layers: {},
          phaseDependencies: {},
          quickMode: {
            allowedCategories: ['bugfix', 'docs', 'test', 'config'],
            maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L2-014', 'L3-001'],
            relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
          },
        }) as never);
        const adapter = new HarnessConfigQuickModeConfigAdapter();
        // Act & Assert
        await expect(adapter.getQuickModeConfig()).resolves.toBeDefined();
      });
    });

    context('quickModeセクションが存在しない場合', () => {
      // IT-REPO-Config-002
      it('デフォルト設定でQuickModeConfigが生成される', async () => {
        // Arrange
        readFileMock.mockResolvedValue(HARNESS_CONFIG_WITHOUT_QUICKMODE as never);
        const adapter = new HarnessConfigQuickModeConfigAdapter();
        // Act
        const actual = await adapter.getQuickModeConfig();
        // Assert
        expect(actual.allowedCategories).toEqual(['bugfix', 'docs', 'test', 'config']);
        expect(actual.maintainedLayers).toEqual(
          expect.arrayContaining(['L1', 'L2-002', 'L2-003', 'L2-014', 'L3-001']),
        );
        expect(actual.relaxedGates).toEqual(
          expect.arrayContaining(['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4']),
        );
      });
    });
  });

  describe('エラーハンドリング', () => {
    // IT-REPO-Config-004
    it('ファイルが存在しないときHarnessConfigNotFoundErrorが投げられる', async () => {
      // Arrange
      const enoentError = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
      readFileMock.mockRejectedValue(enoentError);
      const adapter = new HarnessConfigQuickModeConfigAdapter();
      // Act & Assert
      await expect(adapter.getQuickModeConfig()).rejects.toThrow();
    });

    // IT-REPO-Config-005
    it('JSONパースが失敗するときHarnessConfigParseErrorが投げられる', async () => {
      // Arrange
      readFileMock.mockResolvedValue('invalid json {' as never);
      const adapter = new HarnessConfigQuickModeConfigAdapter();
      // Act & Assert
      await expect(adapter.getQuickModeConfig()).rejects.toThrow();
    });

    // IT-REPO-Config-007
    it('quickMode.allowedCategoriesが空配列のとき、QuickModeConfigErrorが投げられる', async () => {
      // Arrange
      readFileMock.mockResolvedValue(HARNESS_CONFIG_EMPTY_CATEGORIES as never);
      const adapter = new HarnessConfigQuickModeConfigAdapter();
      // Act & Assert
      await expect(adapter.getQuickModeConfig()).rejects.toThrow();
    });
  });

  describe('fullModeRequiredWhen の読み取り（H10-05）', () => {
    context('fullModeRequiredWhen フィールドが未定義の場合', () => {
      // IT-REPO-Config-010
      it('デフォルト値（全 true）が設定される', async () => {
        // Arrange
        readFileMock.mockResolvedValue(HARNESS_CONFIG_WITH_QUICKMODE as never);
        const adapter = new HarnessConfigQuickModeConfigAdapter();
        // Act
        const actual = await adapter.getQuickModeConfig();
        // Assert
        expect(actual.fullModeRequiredWhen.mixedCategories).toBe(true);
        expect(actual.fullModeRequiredWhen.newDomainFile).toBe(true);
        expect(actual.fullModeRequiredWhen.apiContractChange).toBe(true);
      });
    });

    context('fullModeRequiredWhen に明示値が設定されている場合', () => {
      // IT-REPO-Config-011
      it('明示値が保持される', async () => {
        // Arrange
        const config = JSON.stringify({
          project: { name: 'test', preset: 'standard' },
          layers: {},
          phaseDependencies: {},
          quickMode: {
            allowedCategories: ['bugfix'],
            maintainedLayers: ['L1'],
            relaxedGates: ['L4'],
            fullModeRequiredWhen: {
              mixedCategories: false,
              newDomainFile: true,
              apiContractChange: false,
            },
          },
        });
        readFileMock.mockResolvedValue(config as never);
        const adapter = new HarnessConfigQuickModeConfigAdapter();
        // Act
        const actual = await adapter.getQuickModeConfig();
        // Assert
        expect(actual.fullModeRequiredWhen.mixedCategories).toBe(false);
        expect(actual.fullModeRequiredWhen.newDomainFile).toBe(true);
        expect(actual.fullModeRequiredWhen.apiContractChange).toBe(false);
      });
    });

    context('fullModeRequiredWhen が部分定義の場合', () => {
      // IT-REPO-Config-012
      it('未指定フィールドのみデフォルト値（true）で補完される', async () => {
        // Arrange
        const config = JSON.stringify({
          project: { name: 'test', preset: 'standard' },
          layers: {},
          phaseDependencies: {},
          quickMode: {
            allowedCategories: ['bugfix'],
            maintainedLayers: ['L1'],
            relaxedGates: ['L4'],
            fullModeRequiredWhen: {
              mixedCategories: false,
            },
          },
        });
        readFileMock.mockResolvedValue(config as never);
        const adapter = new HarnessConfigQuickModeConfigAdapter();
        // Act
        const actual = await adapter.getQuickModeConfig();
        // Assert
        expect(actual.fullModeRequiredWhen.mixedCategories).toBe(false);
        expect(actual.fullModeRequiredWhen.newDomainFile).toBe(true);
        expect(actual.fullModeRequiredWhen.apiContractChange).toBe(true);
      });
    });
  });
});
