// @unit phase2-extensions
// @layer test
// @story HF2-03
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';

/**
 * HF2-03 AC-3: E2E テスト戦略テンプレート（Playwright 統合）と
 * scenario-test-logic-designer との連携方法がドキュメント化されていること。
 *
 * AC-3 は実行可能なハーネスコードを持たず、スキル markdown 成果物に連携方法が
 * 記述されていることのみが受け入れ基準となる。ファイルの存在確認だけでは弱い証拠に
 * なるため、E2E 戦略テンプレート（references/playwright-patterns.md）と
 * scenario-test-logic-designer SKILL.md が実際に連携（テンプレート参照・実行順序）を
 * 記述していることを、具体的な文言で検証する。markdown の読み込み結果が対象システム。
 */

const SKILL_DIR = path.resolve(
  __dirname,
  '../../../../../skills/scenario-test-logic-designer',
);
const SKILL_PATH = path.join(SKILL_DIR, 'SKILL.md');
const PLAYWRIGHT_PATTERNS_PATH = path.join(SKILL_DIR, 'references/playwright-patterns.md');

target('HF2-03 AC-3 scenario-test-logic-designer 連携アーティファクト適合性', () => {
  context('E2E 戦略テンプレート（Playwright パターン集）が本スキル用と明記されていること', () => {
    it('playwright-patterns.md が scenario-test-logic-designer スキル用テンプレートと宣言していること', () => {
      // Arrange
      const actual = readFileSync(PLAYWRIGHT_PATTERNS_PATH, 'utf-8');
      // Act / Assert
      expect(actual).toContain('scenario-test-logic-designer スキルで使用する Playwright テストパターン');
    });
  });

  context('SKILL.md が E2E 戦略テンプレート（references）との連携を記述していること', () => {
    it('成果物構成で playwright-patterns.md のセクションをテンプレートとして参照していること', () => {
      // Arrange
      const actual = readFileSync(SKILL_PATH, 'utf-8');
      // Act / Assert
      expect(actual).toContain('references/playwright-patterns.md');
      expect(actual).toContain('scenario_test_logic.md');
    });

    it('scenario-test-designer と story-implementor の間に本スキルを位置づける実行順序を記述していること', () => {
      // Arrange
      const actual = readFileSync(SKILL_PATH, 'utf-8');
      // Act / Assert
      expect(actual).toContain('scenario-test-designer');
      expect(actual).toContain('scenario-test-logic-designer');
      expect(actual).toContain('story-implementor');
    });

    it('Playwright を用いた E2E テストロジック設計スキルであることを明記していること', () => {
      // Arrange
      const actual = readFileSync(SKILL_PATH, 'utf-8');
      // Act / Assert
      expect(actual).toContain('Playwright');
      expect(actual).toContain('E2E');
    });
  });
});
