// @layer test
// @unit quick-mode
// @story H10-06
import { describe, expect, it, vi } from 'vitest';
import { target, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { ClassifyChangeCategoryUseCase } from '../../../../../quick-mode/application/usecases/classify-change-category-usecase.js';
import type { QuickModeConfigPort } from '../../../../../quick-mode/application/ports/quick-mode-config-port.js';

const buildSut = (overrides?: { getConfig?: ReturnType<typeof vi.fn> }) => {
  const quickModeConfigPort: QuickModeConfigPort = {
    getConfig: overrides?.getConfig ?? vi.fn().mockResolvedValue(createQuickModeConfig()),
  };
  const sut = new ClassifyChangeCategoryUseCase({ quickModeConfigPort });
  return { sut, quickModeConfigPort };
};

target('ClassifyChangeCategoryUseCase', () => {
  target('execute', () => {
    describe('paths から変更分類とfullModeRequired判定を返す', () => {
      // UT-CCC-001
      it('空配列が渡された場合にdominantCategory=null、perFile=[]、fullModeRequired=falseが返ること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ paths: [] });
        // Assert
        expect(actual.dominantCategory).toBeNull();
        expect(actual.perFile).toEqual([]);
        expect(actual.fullModeRequired).toBe(false);
      });

      // UT-CCC-002
      it("単一の.tsファイル（非domain/非port/非adapter）が渡された場合にdominantCategory='bugfix'、fullModeRequired=falseが返ること", async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ paths: ['src/foo.ts'] });
        // Assert
        expect(actual.dominantCategory).toBe('bugfix');
        expect(actual.fullModeRequired).toBe(false);
      });

      // UT-CCC-003
      it("domain/ 配下のパスが渡された場合に dominantCategory='domain'、fullModeRequired=true、rejectionRule='MIXED_CHANGES' が返ること", async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({
          paths: ['scripts/harness/quick-mode/domain/value-objects/some-vo.ts'],
        });
        // Assert
        expect(actual.dominantCategory).toBe('domain');
        expect(actual.fullModeRequired).toBe(true);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-CCC-004
      it("*port.ts が渡された場合に fullModeRequired=true、rejectionRule='API_CONTRACT' が返ること（allowedCategoriesにapiを含む設定）", async () => {
        // Arrange
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'api'],
        });
        const { sut } = buildSut({
          getConfig: vi.fn().mockResolvedValue(config),
        });
        // Act
        const actual = await sut.execute({
          paths: ['scripts/harness/quick-mode/domain/ports/some-port.ts'],
        });
        // Assert
        expect(actual.fullModeRequired).toBe(true);
        expect(actual.rejectionRule).toBe('API_CONTRACT');
      });

      it("*port.ts のコメントのみ差分が渡された場合に dominantCategory='docs'、fullModeRequired=false が返ること", async () => {
        // Arrange
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config'],
        });
        const { sut } = buildSut({
          getConfig: vi.fn().mockResolvedValue(config),
        });
        const path = 'scripts/harness/quick-mode/domain/ports/some-port.ts';
        // Act
        const actual = await sut.execute({
          paths: [path],
          targetChanges: [{
            filePath: path,
            beforeContent: 'export interface SomePort {\n  run(): void;\n}\n',
            afterContent: '// docs\nexport interface SomePort {\n  run(): void;\n}\n',
          }],
        });
        // Assert
        expect(actual.dominantCategory).toBe('docs');
        expect(actual.perFile).toEqual([{ path, category: 'docs' }]);
        expect(actual.fullModeRequired).toBe(false);
      });

      // UT-CCC-005
      it('perFile に各 path のカテゴリが含まれること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({
          paths: ['docs/foo.md', 'scripts/harness/__tests__/unit/bar.test.ts'],
        });
        // Assert
        expect(actual.perFile).toEqual([
          { path: 'docs/foo.md', category: 'docs' },
          { path: 'scripts/harness/__tests__/unit/bar.test.ts', category: 'test' },
        ]);
      });

      // UT-CCC-NEW-DOMAIN-01: changeKind ハードコード回帰
      it("beforeContent=null かつ afterContent ありの domain/ ファイルが CREATE と判定され rejectionRule='NEW_DOMAIN' が返ること", async () => {
        // Arrange: domain を allowedCategories に含めることで MIXED_CHANGES を回避し
        // NEW_DOMAIN 判定に到達させる。以前は changeKind が MODIFY 固定だったため
        // 新規 domain ファイルでも NEW_DOMAIN が発火しなかった。
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain'],
        });
        const { sut } = buildSut({
          getConfig: vi.fn().mockResolvedValue(config),
        });
        const path = 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts';
        // Act
        const actual = await sut.execute({
          paths: [path],
          targetChanges: [{ filePath: path, beforeContent: null, afterContent: 'export const created = 1;\n' }],
        });
        // Assert
        expect(actual.fullModeRequired).toBe(true);
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
      });

      // UT-CCC-NEW-DOMAIN-02: 既存 domain ファイルの変更は NEW_DOMAIN にならない
      it('beforeContent ありの domain/ ファイル（既存の変更）は NEW_DOMAIN にならないこと', async () => {
        // Arrange
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain'],
        });
        const { sut } = buildSut({
          getConfig: vi.fn().mockResolvedValue(config),
        });
        const path = 'scripts/harness/quick-mode/domain/value-objects/existing-vo.ts';
        // Act
        const actual = await sut.execute({
          paths: [path],
          targetChanges: [{
            filePath: path,
            beforeContent: 'export const value = 1;\n',
            afterContent: 'export const value = 2;\n',
          }],
        });
        // Assert
        expect(actual.rejectionRule).not.toBe('NEW_DOMAIN');
      });

      // UT-CCC-006
      it('fullModeRequiredWhen の全ルールが false の場合に domain/ CREATE でも fullModeRequired=false が返ること', async () => {
        // Arrange
        const config = createQuickModeConfig({
          fullModeRequiredWhen: {
            mixedCategories: false,
            newDomainFile: false,
            apiContractChange: false,
          },
        });
        const { sut } = buildSut({
          getConfig: vi.fn().mockResolvedValue(config),
        });
        // Act
        const actual = await sut.execute({
          paths: ['scripts/harness/quick-mode/domain/value-objects/new-vo.ts'],
        });
        // Assert
        expect(actual.fullModeRequired).toBe(false);
        expect(actual.rejectionRule).toBeUndefined();
      });
    });
  });
});
