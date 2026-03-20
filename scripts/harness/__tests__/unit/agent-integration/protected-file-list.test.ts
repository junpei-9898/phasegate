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
