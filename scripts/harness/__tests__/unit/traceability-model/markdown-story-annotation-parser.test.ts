// @layer test
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

    context('code-span (backtick) 内の @story-id がある場合 (UT-MSAP-P2-1-A)', () => {
      it('inline 注釈として検出されないこと', () => {
        // Arrange
        const content = [
          '設計要素の直前に `@story-id H03-01` を付与します。',
          '次の行',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('code-span 混在行で backtick 外に有効な @story-id がある場合 (UT-MSAP-P2-1-B)', () => {
      it('backtick 外の注釈のみ inline として検出されること', () => {
        // Arrange
        const content = [
          '`@story-id H04-01` を書いた後に @story-id H04-02 を追加する',
          '次の行',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].storyIdValue).toBe('H04-02');
        expect(actual[0].standaloneLine).toBe(false);
      });
    });

    context('code-fence (```) 内の @story-id がある場合 (UT-MSAP-P2-1-C)', () => {
      it('fence 内の行はスキップされること', () => {
        // Arrange
        const content = [
          '```',
          '@story-id H03-01',
          '## 見出し',
          '```',
          '本文',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('言語付き code-fence (```ts) 内の @story-id がある場合 (UT-MSAP-P2-1-D)', () => {
      it('fence 内の行はスキップされること', () => {
        // Arrange
        const content = [
          '```ts',
          '// @story-id H03-02',
          '```',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('tilde code-fence (~~~) 内の @story-id がある場合 (UT-MSAP-P2-1-E)', () => {
      it('fence 内の行はスキップされること', () => {
        // Arrange
        const content = [
          '~~~',
          '@story-id H05-01',
          '~~~',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context('code-fence の外側と内側が混在する場合 (UT-MSAP-P2-1-F)', () => {
      it('fence 外の独立行 @story-id のみ検出されること', () => {
        // Arrange
        const content = [
          '@story-id H03-01',
          '## セクション1',
          '',
          '```',
          '@story-id H99-99',
          '```',
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

    context('closing fence の前後で言及された @story-id (UT-MSAP-P2-1-G)', () => {
      it('fence 終了後の行からは再度検出されること', () => {
        // Arrange
        const content = [
          '```',
          '@story-id H99-99',
          '```',
          '@story-id H03-01',
          '## セクション',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].storyIdValue).toBe('H03-01');
        expect(actual[0].lineNumber).toBe(4);
      });
    });

    context('backtick fence が tilde fence を内包する場合 (UT-MSAP-P2-1-H)', () => {
      it('backtick fence の閉じまで一貫してスキップされること (fence char 一致で判定)', () => {
        // Arrange
        const content = [
          '```',
          '~~~',
          '@story-id H99-99',
          '~~~',
          '```',
          '@story-id H03-01',
        ].join('\n');

        // Act
        const actual = parseStoryAnnotations(content);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].storyIdValue).toBe('H03-01');
      });
    });
  });
});
