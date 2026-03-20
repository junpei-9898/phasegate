import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  parseImplementationTags,
  parseTestTags,
  parseAllTags,
} from '../../../traceability-model/infrastructure/parsers/source-metadata-parser.js';

target('parseImplementationTags', () => {
  describe('TypeScript/JSDocコメントから実装タグを抽出する', () => {
    context('JSDocコメント内に @unit と @layer がある場合', () => {
      it('@unit と @layer の両方が抽出されること', () => {
        // Arrange
        const content = [
          '/**',
          ' * @layer infrastructure',
          ' * @unit traceability-model',
          ' */',
          'export class Foo {}',
        ].join('\n');

        // Act
        const actual = parseImplementationTags(content);

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0]).toEqual({ type: '@layer', value: 'infrastructure', lineNumber: 2 });
        expect(actual[1]).toEqual({ type: '@unit', value: 'traceability-model', lineNumber: 3 });
      });
    });

    context('行コメントにタグがある場合', () => {
      it('タグが抽出されること', () => {
        // Arrange
        const content = [
          '// @unit config-foundation',
          '// @layer domain',
        ].join('\n');

        // Act
        const actual = parseImplementationTags(content);

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0]).toEqual({ type: '@unit', value: 'config-foundation', lineNumber: 1 });
        expect(actual[1]).toEqual({ type: '@layer', value: 'domain', lineNumber: 2 });
      });
    });

    context('@story-id タグがある場合', () => {
      it('@story-id が抽出されること', () => {
        // Arrange
        const content = [
          '/**',
          ' * @unit foo',
          ' * @layer domain',
          ' * @story-id H03-01',
          ' */',
        ].join('\n');

        // Act
        const actual = parseImplementationTags(content);

        // Assert
        expect(actual).toHaveLength(3);
        expect(actual[2]).toEqual({ type: '@story-id', value: 'H03-01', lineNumber: 4 });
      });
    });

    context('タグがない場合', () => {
      it('空配列を返すこと', () => {
        // Arrange
        const content = 'const x = 1;\nconsole.log(x);';

        // Act
        const actual = parseImplementationTags(content);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('@story タグがある場合', () => {
      it('実装タグ抽出では @story は無視されること', () => {
        // Arrange
        const content = [
          '/**',
          ' * @unit foo',
          ' * @layer domain',
          ' * @story H03-01',
          ' */',
        ].join('\n');

        // Act
        const actual = parseImplementationTags(content);

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual.every((tag) => tag.type !== '@story')).toBe(true);
      });
    });

    context('行番号の保持', () => {
      it('正しい行番号が記録されること', () => {
        // Arrange
        const content = [
          '',
          '',
          '/**',
          ' * @unit my-unit',
          ' */',
        ].join('\n');

        // Act
        const actual = parseImplementationTags(content);

        // Assert
        expect(actual[0].lineNumber).toBe(4);
      });
    });
  });
});

target('parseTestTags', () => {
  describe('テストファイルから @story タグを抽出する', () => {
    context('@story タグがある場合', () => {
      it('@story が抽出されること', () => {
        // Arrange
        const content = [
          '/**',
          ' * @story H03-02',
          ' */',
          'describe("test", () => {});',
        ].join('\n');

        // Act
        const actual = parseTestTags(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]).toEqual({ type: '@story', value: 'H03-02', lineNumber: 2 });
      });
    });

    context('複数の @story タグがある場合', () => {
      it('全て抽出されること', () => {
        // Arrange
        const content = [
          '// @story H03-01',
          '// @story H03-02',
        ].join('\n');

        // Act
        const actual = parseTestTags(content);

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0].value).toBe('H03-01');
        expect(actual[1].value).toBe('H03-02');
      });
    });

    context('@unit や @layer がある場合', () => {
      it('テストタグ抽出では無視されること', () => {
        // Arrange
        const content = [
          '// @unit foo',
          '// @layer domain',
          '// @story H03-01',
        ].join('\n');

        // Act
        const actual = parseTestTags(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].type).toBe('@story');
      });
    });
  });
});

target('parseAllTags', () => {
  describe('全タグ種別を抽出する', () => {
    context('全種別のタグが含まれる場合', () => {
      it('全タグが抽出されること', () => {
        // Arrange
        const content = [
          '/**',
          ' * @unit my-unit',
          ' * @layer domain',
          ' * @story-id H01-01',
          ' * @story H02-02',
          ' */',
        ].join('\n');

        // Act
        const actual = parseAllTags(content);

        // Assert
        expect(actual).toHaveLength(4);
        expect(actual[0].type).toBe('@unit');
        expect(actual[1].type).toBe('@layer');
        expect(actual[2].type).toBe('@story-id');
        expect(actual[3].type).toBe('@story');
      });
    });
  });
});
