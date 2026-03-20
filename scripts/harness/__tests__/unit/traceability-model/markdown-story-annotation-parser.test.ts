import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { parseStoryAnnotations } from '../../../traceability-model/infrastructure/parsers/markdown-story-annotation-parser.js';

target('parseStoryAnnotations', () => {
  describe('Markdown本文から @story-id 注釈を抽出する', () => {
    context('独立行に @story-id がある場合', () => {
      it('standaloneLine: true として抽出されること', () => {
        // Arrange
        const content = [
          '@story-id H03-01',
          '## セクション見出し',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].storyIdValue).toBe('H03-01');
        expect(actual[0].lineNumber).toBe(1);
        expect(actual[0].standaloneLine).toBe(true);
        expect(actual[0].contextLine).toBe('## セクション見出し');
      });
    });

    context('複数の @story-id がある場合', () => {
      it('全て抽出されること', () => {
        // Arrange
        const content = [
          '@story-id H03-01',
          '## セクション1',
          '',
          '@story-id H03-02',
          '## セクション2',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0].storyIdValue).toBe('H03-01');
        expect(actual[1].storyIdValue).toBe('H03-02');
      });
    });

    context('インラインで @story-id が記述されている場合', () => {
      it('standaloneLine: false として抽出されること', () => {
        // Arrange
        const content = [
          '何かのテキスト @story-id H03-01 追加テキスト',
          '次の行',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].storyIdValue).toBe('H03-01');
        expect(actual[0].standaloneLine).toBe(false);
      });
    });

    context('@story-id がない場合', () => {
      it('空配列を返すこと', () => {
        // Arrange
        const content = [
          '# タイトル',
          '',
          'ただのテキスト',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('最終行に @story-id がある場合', () => {
      it('contextLine が空文字になること', () => {
        // Arrange
        const content = '@story-id H03-01';

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].contextLine).toBe('');
      });
    });

    context('前後に空白がある独立行の場合', () => {
      it('trimされて独立行と判定されること', () => {
        // Arrange
        const content = [
          '  @story-id H03-01  ',
          '## 見出し',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].standaloneLine).toBe(true);
        expect(actual[0].storyIdValue).toBe('H03-01');
      });
    });

    context('行番号の正確性', () => {
      it('正しい行番号が記録されること', () => {
        // Arrange
        const content = [
          '# タイトル',
          '',
          '',
          '@story-id H03-01',
          '## セクション',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual[0].lineNumber).toBe(4);
      });
    });
  });
});
