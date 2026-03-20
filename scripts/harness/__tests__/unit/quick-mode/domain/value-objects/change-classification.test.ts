import { describe, expect, it } from 'vitest';
import { target, context, createChangedFile, createQuickModeConfig } from '../../../../helpers/test-helpers.js';
import { QuickModeJudgmentEngine } from '../../../../../quick-mode/domain/services/quick-mode-judgment-engine.js';
import { ChangedFile } from '../../../../../quick-mode/domain/value-objects/changed-file.js';

// ChangeClassificationはclassify()の返り値を通じて検証する
const engine = new QuickModeJudgmentEngine();

target('ChangeClassification', () => {
  target('getFiles', () => {
    describe('指定カテゴリのファイル一覧を返す', () => {
      // UT-CCLS-001
      it("'docs'カテゴリのファイルが含まれる分類結果の場合に対応するChangedFile[]が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({ filePath: 'docs/design/overview.md', changeKind: 'MODIFY' }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.getFiles('docs');
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].filePath).toBe('docs/design/overview.md');
      });

      // UT-CCLS-002
      it('指定カテゴリのファイルが存在しない場合に空配列が返ること', () => {
        // Arrange
        const files = [createChangedFile('docs/design/overview.md', 'MODIFY')];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.getFiles('api');
        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('hasCategory', () => {
    describe('指定カテゴリが含まれるかを判定する', () => {
      // UT-CCLS-003
      it("'domain'カテゴリのファイルが含まれる場合にtrueが返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasCategory('domain');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CCLS-004
      it("'api'カテゴリのファイルが含まれない場合にfalseが返ること", () => {
        // Arrange
        const files = [createChangedFile('docs/design/overview.md', 'MODIFY')];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasCategory('api');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('hasAnyRejectable', () => {
    describe('拒否対象カテゴリが含まれるかを判定する', () => {
      // UT-CCLS-005
      it("'domain'/'api'/'feature'のいずれかが含まれる場合にtrueが返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasAnyRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CCLS-006
      it("全ファイルが'bugfix'/'docs'/'test'/'config'のみの場合にfalseが返ること", () => {
        // Arrange
        const files = [
          createChangedFile('scripts/harness/quick-mode/services/quick-service.ts', 'MODIFY'),
          ChangedFile.create({ filePath: 'docs/design/overview.md', changeKind: 'MODIFY' }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasAnyRejectable();
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('dominantCategory', () => {
    describe('最高リスクカテゴリが正しく選択される', () => {
      // UT-CCLS-007
      it("'api'と'domain'が混在する場合にdominantCategoryが'api'であること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }),
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.dominantCategory;
        // Assert
        expect(actual?.toString()).toBe('api');
      });

      // UT-CCLS-008
      it("'domain'と'bugfix'が混在する場合にdominantCategoryが'domain'であること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
          createChangedFile('scripts/harness/quick-mode/services/quick-service.ts', 'MODIFY'),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.dominantCategory;
        // Assert
        expect(actual?.toString()).toBe('domain');
      });

      // UT-CCLS-009
      it("全ファイルがallowed内（'bugfix'のみ）の場合にdominantCategoryが拒否対象を示さないこと", () => {
        // Arrange
        const files = [
          createChangedFile('scripts/harness/quick-mode/services/quick-service.ts', 'MODIFY'),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.dominantCategory;
        // Assert
        expect(actual?.isQuickModeRejectable()).toBeFalsy();
      });
    });
  });

  target('equals', () => {
    describe('2つのChangeClassificationの値等価性を判定する', () => {
      // UT-CCLS-010
      it('同一の分類結果を持つ2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const files = [createChangedFile()];
        const config = createQuickModeConfig();
        const sut = engine.classify(files, config);
        const other = engine.classify(files, config);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
