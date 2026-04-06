// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  FilePath,
} from '../../../biome-ast-engine/domain/value-objects/file-path.js';

const createFilePath = (value = 'biome-ast-engine/domain/example.ts'): FilePath =>
  FilePath.fromWorkspaceRelative(value);

target('FilePath.fromWorkspaceRelative', () => {
  describe('プロジェクト相対パスを生成する', () => {
    context('正常な相対パスの場合', () => {
      it('FilePathが生成される', () => {
        // Arrange
        const input = 'biome-ast-engine/domain/rule.ts';

        // Act
        const actual = FilePath.fromWorkspaceRelative(input);

        // Assert
        expect(actual.fileName()).toBe('rule.ts');
      });
    });
  });
});

target('FilePath.segments', () => {
  describe('パスセグメントを返す', () => {
    context('複数階層のパスの場合', () => {
      it('セグメント配列が正しく返される', () => {
        // Arrange
        const sut = createFilePath('biome-ast-engine/domain/rule.ts');

        // Act
        const actual = sut.segments();

        // Assert
        expect(actual).toEqual(['biome-ast-engine', 'domain', 'rule.ts']);
      });
    });

    context('単一ファイル名の場合', () => {
      it('1要素の配列が返される', () => {
        // Arrange
        const sut = createFilePath('rule.ts');

        // Act
        const actual = sut.segments();

        // Assert
        expect(actual).toEqual(['rule.ts']);
      });
    });
  });
});

target('FilePath.fileName', () => {
  describe('ファイル名を返す', () => {
    context('複数階層のパスの場合', () => {
      it('末尾のファイル名が返される', () => {
        // Arrange
        const sut = createFilePath('biome-ast-engine/domain/rule.ts');

        // Act
        const actual = sut.fileName();

        // Assert
        expect(actual).toBe('rule.ts');
      });
    });
  });
});

target('FilePath.extension', () => {
  describe('拡張子を返す', () => {
    context('.tsファイルの場合', () => {
      it('"ts"が返される', () => {
        // Arrange
        const sut = createFilePath('biome-ast-engine/domain/rule.ts');

        // Act
        const actual = sut.extension();

        // Assert
        expect(actual).toBe('ts');
      });
    });

    context('.test.tsファイルの場合', () => {
      it('"ts"が返される', () => {
        // Arrange
        const sut = createFilePath('biome-ast-engine/domain/rule.test.ts');

        // Act
        const actual = sut.extension();

        // Assert
        expect(actual).toBe('ts');
      });
    });
  });
});

target('FilePath.startsWith', () => {
  describe('パスが指定セグメントで始まるかを判定する', () => {
    context('一致するセグメントの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createFilePath('biome-ast-engine/domain/rule.ts');
        const prefix = 'biome-ast-engine';

        // Act
        const actual = sut.startsWith(prefix);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('一致しないセグメントの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createFilePath('biome-ast-engine/domain/rule.ts');
        const prefix = 'other-unit';

        // Act
        const actual = sut.startsWith(prefix);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

