// @unit agent-integration
// @layer domain
// @story H11-02

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ProtectedFileList, ProtectedFileListEmptyError } from '../../../agent-integration/domain/value-objects/protected-file-list.js';
import { createProtectedFileList } from '../../helpers/test-helpers.js';

target('ProtectedFileList', () => {
  describe('正常なpatternsからProtectedFileListを生成する', () => {
    // UT-PFL-001
    it('2件のpatternsで生成が成功すること', () => {
      // Arrange
      const patterns = ['biome.json', 'tsconfig.json'];
      // Act
      const actual = ProtectedFileList.create({ patterns });
      // Assert
      expect(actual).toBeInstanceOf(ProtectedFileList);
    });

    // UT-PFL-002
    it('1件のpatterns（最小有効）で生成が成功すること', () => {
      // Arrange
      const patterns = ['biome.json'];
      // Act
      const actual = ProtectedFileList.create({ patterns });
      // Assert
      expect(actual).toBeInstanceOf(ProtectedFileList);
    });
  });

  context('patternsが空配列の場合（INV-4違反）', () => {
    // UT-PFL-010
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const patterns: string[] = [];
      // Act
      const actual = () => ProtectedFileList.create({ patterns });
      // Assert
      expect(actual).toThrow(ProtectedFileListEmptyError);
    });

    // UT-PFL-011
    it('エラーメッセージに「patternsは1件以上」等の識別情報が含まれること', () => {
      // Arrange
      const patterns: string[] = [];
      let caughtError: Error | undefined;
      // Act
      try {
        ProtectedFileList.create({ patterns });
      } catch (e) {
        caughtError = e as Error;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/patternsは1件以上|patterns.*1件/);
    });
  });

  target('matches()', () => {
    describe('完全一致のfilePathをマッチする', () => {
      // UT-PFL-020
      it('patterns=["biome.json"]でfilePath="biome.json"のときtrueを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('biome.json');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-PFL-021
      it('patterns=["biome.json"]でfilePath="tsconfig.json"のときfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('tsconfig.json');
        // Assert
        expect(actual).toBe(false);
      });

      // UT-PFL-022
      it('複数patternsのうち1件一致するfilePathのときtrueを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['.biome.json', 'tsconfig.json', 'package.json']);
        // Act
        const actual = sut.matches('package.json');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-PFL-023
      it('パスプレフィックスがある場合に完全一致しないためfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('src/biome.json');
        // Assert
        expect(actual).toBe(false);
      });
    });

    describe('globパターンでマッチする', () => {
      // UT-PFL-024
      it('patterns=["**/*.json"]でfilePath="src/config.json"のときtrueを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['**/*.json']);
        // Act
        const actual = sut.matches('src/config.json');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-PFL-025
      it('patterns=["**/*.json"]でfilePath="src/config.ts"のときfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['**/*.json']);
        // Act
        const actual = sut.matches('src/config.ts');
        // Assert
        expect(actual).toBe(false);
      });
    });

    context('filePathが空文字の場合（境界値）', () => {
      // UT-PFL-030 / UT-BV-011
      it('falseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('');
        // Assert
        expect(actual).toBe(false);
      });
    });

    context('filePathが大文字の場合（境界値）', () => {
      // UT-PFL-031 / UT-BV-012
      it('大文字小文字を区別してfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('BIOME.JSON');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('createWithExclusions()', () => {
    // UT-PFL-050
    it('除外パターンに一致するDEFAULT_PATTERNSがフィルタリングされること', () => {
      // Arrange
      const exclusions = ['tsconfig.json'];
      // Act
      const actual = ProtectedFileList.createWithExclusions(exclusions);
      // Assert
      expect(actual.matches('tsconfig.json')).toBe(false);
    });

    // UT-PFL-051
    it('除外対象外のDEFAULT_PATTERNSは残ること', () => {
      // Arrange
      const exclusions = ['tsconfig.json'];
      // Act
      const actual = ProtectedFileList.createWithExclusions(exclusions);
      // Assert
      expect(actual.matches('biome.json')).toBe(true);
      expect(actual.matches('package.json')).toBe(true);
    });

    // UT-PFL-052
    it('全DEFAULT_PATTERNS除外時にフォールバックで全パターンが復元されること', () => {
      // Arrange
      const exclusions = [
        'biome.json',
        '.biome.json',
        'tsconfig.json',
        'package.json',
        'package-lock.json',
        '.phasegate/baseline.json',
        '**/.phasegate/baseline.json',
        '.husky/**',
        '**/.husky/**',
      ];
      // Act
      const actual = ProtectedFileList.createWithExclusions(exclusions);
      // Assert
      expect(actual.matches('tsconfig.json')).toBe(true);
      expect(actual.matches('package.json')).toBe(true);
    });

    // UT-PFL-053
    it('空の除外リストではDEFAULT_PATTERNSがそのまま有効であること', () => {
      // Arrange
      const exclusions: string[] = [];
      // Act
      const actual = ProtectedFileList.createWithExclusions(exclusions);
      // Assert
      expect(actual.matches('tsconfig.json')).toBe(true);
      expect(actual.matches('package.json')).toBe(true);
    });
  });

  target('createWithAdditionalAndExclusions()', () => {
    // UT-PFL-060
    it('追加パターンが含まれ除外パターンが除かれること', () => {
      // Arrange
      const additional = ['custom.config.js'];
      const exclusions = ['tsconfig.json'];
      // Act
      const actual = ProtectedFileList.createWithAdditionalAndExclusions(additional, exclusions);
      // Assert
      expect(actual.matches('custom.config.js')).toBe(true);
      expect(actual.matches('tsconfig.json')).toBe(false);
      expect(actual.matches('biome.json')).toBe(true);
    });

    // UT-PFL-061
    it('追加も除外も空の場合はDEFAULT_PATTERNSがそのまま有効であること', () => {
      // Arrange
      const additional: string[] = [];
      const exclusions: string[] = [];
      // Act
      const actual = ProtectedFileList.createWithAdditionalAndExclusions(additional, exclusions);
      // Assert
      expect(actual.matches('tsconfig.json')).toBe(true);
      expect(actual.matches('package.json')).toBe(true);
    });
  });

  context('baseline.json 保護 (P-5 grandfather bypass 回帰)', () => {
    // UT-PFL-070
    it('デフォルトで .phasegate/baseline.json への書き込みを保護対象とすること', () => {
      // Arrange
      const actual = ProtectedFileList.createDefault();
      // Act & Assert
      expect(actual.matches('.phasegate/baseline.json')).toBe(true);
    });

    // UT-PFL-071
    it('サブディレクトリ配下の .phasegate/baseline.json も保護対象とすること', () => {
      // Arrange
      const actual = ProtectedFileList.createWithAdditionalAndExclusions([], []);
      // Act & Assert
      expect(actual.matches('packages/app/.phasegate/baseline.json')).toBe(true);
    });
  });

  context('.husky 保護 (WI-363 L0 runtime 実施点)', () => {
    // UT-PFL-072
    it('デフォルトで .husky/pre-commit への書き込みを保護対象とすること', () => {
      // Arrange
      const sut = ProtectedFileList.createDefault();
      // Act
      const actual = sut.matches('.husky/pre-commit');
      // Assert
      expect(actual).toBe(true);
    });

    // UT-PFL-073
    it('デフォルトで .husky/commit-msg への書き込みを保護対象とすること', () => {
      // Arrange
      const sut = ProtectedFileList.createDefault();
      // Act
      const actual = sut.matches('.husky/commit-msg');
      // Assert
      expect(actual).toBe(true);
    });

    // UT-PFL-074
    it('サブディレクトリ配下の .husky/pre-commit も保護対象とすること', () => {
      // Arrange
      const sut = ProtectedFileList.createWithAdditionalAndExclusions([], []);
      // Act
      const actual = sut.matches('packages/app/.husky/pre-commit');
      // Assert
      expect(actual).toBe(true);
    });

    // UT-PFL-075
    it('.husky に前方一致するだけの別ディレクトリは保護対象外とすること', () => {
      // Arrange
      const sut = ProtectedFileList.createDefault();
      // Act
      const actual = sut.matches('.husky-backup/pre-commit');
      // Assert
      expect(actual).toBe(false);
    });

    // UT-PFL-076
    it('exclude 指定で .husky 保護を解除できること', () => {
      // Arrange
      const exclusions = ['.husky/**', '**/.husky/**'];
      // Act
      const actual = ProtectedFileList.createWithExclusions(exclusions);
      // Assert
      expect(actual.matches('.husky/pre-commit')).toBe(false);
      expect(actual.matches('package.json')).toBe(true);
    });
  });

  describe('等値性を検証する', () => {
    // UT-PFL-040
    it('同一patternsを持つ2つのProtectedFileListが等値であること', () => {
      // Arrange
      const a = createProtectedFileList(['biome.json', 'tsconfig.json']);
      const b = createProtectedFileList(['biome.json', 'tsconfig.json']);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-PFL-041
    it('パターン順序が異なる2つのProtectedFileListが非等値であること', () => {
      // Arrange
      const a = createProtectedFileList(['biome.json', 'tsconfig.json']);
      const b = createProtectedFileList(['tsconfig.json', 'biome.json']);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
