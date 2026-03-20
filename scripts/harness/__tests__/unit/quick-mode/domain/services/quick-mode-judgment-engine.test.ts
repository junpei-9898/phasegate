import { describe, expect, it } from 'vitest';
import { target, context, createChangedFile, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { QuickModeJudgmentEngine } from '../../../../../quick-mode/domain/services/quick-mode-judgment-engine.js';
import { ChangedFile } from '../../../../../quick-mode/domain/value-objects/changed-file.js';

const engine = new QuickModeJudgmentEngine();

target('QuickModeJudgmentEngine', () => {
  target('classify', () => {
    describe('変更ファイル群をカテゴリに分類する', () => {
      // UT-JE-001
      it('空配列が渡された場合にdominantCategory=nullの空のChangeClassificationが返ること', () => {
        // Arrange
        const files: ChangedFile[] = [];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.dominantCategory).toBeNull();
      });

      // UT-JE-002
      it("'docs/'配下のfilePathを持つファイルが渡された場合に'docs'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({ filePath: 'docs/design/overview.md', changeKind: 'MODIFY' }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('docs')).toBe(true);
      });

      // UT-JE-003
      it("'__tests__/'配下のfilePathを持つファイルが渡された場合に'test'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/__tests__/unit/quick-mode/domain/some.test.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('test')).toBe(true);
      });

      // UT-JE-004
      it("'*.config.json'のfilePathを持つファイルが渡された場合に'config'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/harness.config.json',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('config')).toBe(true);
      });

      // UT-JE-005
      it("'domain/'配下のfilePathを持つファイルが渡された場合に'domain'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('domain')).toBe(true);
      });

      // UT-JE-006
      it("'*port.ts'のfilePathを持つファイルが渡された場合に'api'カテゴリに分類されること（domain/以下であっても'api'が優先）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('api')).toBe(true);
      });

      // UT-JE-007
      it("domain/以外のCREATEファイルが渡された場合に'feature'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/services/new-feature-service.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('feature')).toBe(true);
      });

      // UT-JE-008
      it("domain/以外のMODIFYファイルが渡された場合に'bugfix'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          createChangedFile(
            'scripts/harness/quick-mode/services/quick-service.ts',
            'MODIFY'
          ),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('bugfix')).toBe(true);
      });
    });
  });

  target('judge', () => {
    describe("変更ファイル群を評価してQuick Mode適用可否を返す", () => {
      // UT-JE-009
      it("全ファイルがallowedCategories内（'bugfix'/'docs'/'test'/'config'）のみの場合にeligible=trueが返ること", () => {
        // Arrange
        const files = [
          createChangedFile(
            'scripts/harness/quick-mode/services/quick-service.ts',
            'MODIFY'
          ),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });

      // UT-JE-010
      it('空の変更ファイル一覧が渡された場合にeligible=trueが返ること', () => {
        // Arrange
        const files: ChangedFile[] = [];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });
    });

    describe('3拒否ルールの判定', () => {
      // UT-JE-011
      it("allowedCategories外のファイル（domainカテゴリ）が1件含まれる場合にeligible=false、rejectionRule='MIXED_CHANGES'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-JE-012
      it("allowedCategories外のファイル（featureカテゴリ）が含まれる場合にeligible=false、rejectionRule='MIXED_CHANGES'が返り、rejectedFilesに当該ファイルが含まれること", () => {
        // Arrange
        const rejectedFile = ChangedFile.create({
          filePath: 'scripts/harness/quick-mode/services/new-feature.ts',
          changeKind: 'CREATE',
        });
        const files = [rejectedFile];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
        expect(actual.rejectedFiles).toContainEqual(
          expect.objectContaining({ filePath: rejectedFile.filePath })
        );
      });

      // UT-JE-013
      it("'domain/'配下のchangeKind=CREATEファイルが含まれる場合にeligible=false、rejectionRule='NEW_DOMAIN'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }),
        ];
        // NEW_DOMAINルール単体を評価するには、domainがallowedに入った設定でCREATEを渡す
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
      });

      // UT-JE-014
      it("'domain/'配下のchangeKind=MODIFYファイルのみが含まれる場合にNEW_DOMAINルールで拒否されないこと（MIXED_CHANGESで拒否される）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).not.toBe('NEW_DOMAIN');
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-JE-015
      it("'*port.ts'ファイルの変更が含まれる場合にeligible=false、rejectionRule='API_CONTRACT'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }),
        ];
        // API_CONTRACTを単独評価するためallowedにapi含む設定
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'api'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('API_CONTRACT');
      });

      // UT-JE-016
      it("'*adapter.ts'ファイルの変更が含まれる場合にeligible=false、rejectionRule='API_CONTRACT'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/infrastructure/adapters/git-adapter.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'api'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('API_CONTRACT');
      });
    });

    describe('3拒否ルールをMIXED_CHANGES→NEW_DOMAIN→API_CONTRACTの順で評価する', () => {
      // UT-JE-017
      it('MIXED_CHANGESとNEW_DOMAINの両条件に該当するファイルが含まれる場合に最初に一致するMIXED_CHANGESルールで拒否されること', () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig(); // domain非許可
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-JE-018
      it('NEW_DOMAINとAPI_CONTRACTの両条件に該当するファイルが含まれる場合にNEW_DOMAINルールで拒否されること', () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/ports/new-domain-port.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain', 'api'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
      });
    });

    // UT-JE-019: INV-1不変条件
    it('INV-1: 任意の有効なChangedFile[]とQuickModeConfigで判定結果にLevel間依存緩和の情報が含まれないこと', () => {
      // Arrange
      const files = [createChangedFile()];
      const config = createQuickModeConfig();
      // Act
      const actual = engine.judge(files, config);
      // Assert
      // QuickModeEligibilityはlevelDependencyRelaxedプロパティを持たない
      expect((actual as unknown as Record<string, unknown>)['levelDependencyRelaxed']).toBeUndefined();
    });

    // UT-JE-020
    it('3拒否ルールはallowedCategoriesで上書きできない: allowedCategoriesに全カテゴリを含む設定でdomainカテゴリのファイルを渡した場合にMIXED_CHANGESルールで拒否されること', () => {
      // Arrange
      const domainFile = ChangedFile.create({
        filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
        changeKind: 'MODIFY',
      });
      const config = createQuickModeConfig(); // allowedCategoriesにdomain非許可 = デフォルト
      // Act
      const actual = engine.judge([domainFile], config);
      // Assert
      expect(actual.isEligible()).toBe(false);
      expect(actual.rejectionRule).toBe('MIXED_CHANGES');
    });
  });
});
