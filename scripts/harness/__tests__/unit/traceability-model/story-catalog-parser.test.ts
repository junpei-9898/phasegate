// @layer test
import { expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { parseStoryCatalog } from '../../../traceability-model/infrastructure/parsers/story-catalog-parser.ts';

target('parseStoryCatalog', () => {
  context('見出し行と後続の旧US行が空行を挟んで離れている実データ形式の場合', () => {
    it('見出しの StoryId と 旧US: US-xxx が正しく alias に対応付けられること', () => {
      // Arrange
      const content = [
        '### H01-01: v0コア4ルールのBiomeプラグイン移植',
        '',
        '**Epic**: H-01 Biome AST解析基盤',
        '**旧US**: US-036',
        '**優先度**: Must',
      ].join('\n');

      // Act
      const actual = parseStoryCatalog(content);

      // Assert
      expect(actual.aliasMap.get('US-036')).toBe('H01-01');
    });
  });

  context('複数の見出しブロックがある場合', () => {
    it('各 旧US がそれぞれ直前の見出しの StoryId に対応付けられること', () => {
      // Arrange
      const content = [
        '### H01-01: story one',
        '',
        '**旧US**: US-036',
        '',
        '### H02-04: story two',
        '',
        '**旧US**: US-100',
      ].join('\n');

      // Act
      const actual = parseStoryCatalog(content);

      // Assert
      expect(actual.aliasMap.get('US-036')).toBe('H01-01');
      expect(actual.aliasMap.get('US-100')).toBe('H02-04');
    });
  });

  context('HF\\d+ 形式の Epic 見出しの場合', () => {
    it('HF2-01 見出しの旧US が HF2-01 に対応付けられること', () => {
      // Arrange
      const content = [
        '### HF2-01: phase2 extension story',
        '',
        '**旧US**: US-200',
      ].join('\n');

      // Act
      const actual = parseStoryCatalog(content);

      // Assert
      expect(actual.aliasMap.get('US-200')).toBe('HF2-01');
      expect(actual.storyIds).toContain('HF2-01');
    });
  });

  context('見出しの後に別の非StoryId見出しが挟まる場合', () => {
    it('スコープ外の旧US行は前の見出しに誤って対応付けられないこと', () => {
      // Arrange
      const content = [
        '### H01-01: story one',
        '',
        '## 別セクション',
        '',
        '**旧US**: US-999',
      ].join('\n');

      // Act
      const actual = parseStoryCatalog(content);

      // Assert
      expect(actual.aliasMap.has('US-999')).toBe(false);
    });
  });
});
