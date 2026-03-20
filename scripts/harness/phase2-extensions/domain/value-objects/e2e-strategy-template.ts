/**
 * @layer domain
 * @unit phase2-extensions
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export class E2EStrategyTemplate {
  readonly templateContent: string;
  readonly targetPhase: string;
  readonly generatedAt: string;

  private constructor(props: { templateContent: string; targetPhase: string; generatedAt: string }) {
    this.templateContent = props.templateContent;
    this.targetPhase = props.targetPhase;
    this.generatedAt = props.generatedAt;
    Object.freeze(this);
  }

  static create(targetPhase: string, now: Date = new Date()): E2EStrategyTemplate {
    if (targetPhase.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-209', 'targetPhase は空文字不可です');
    }

    const generatedAt = now.toISOString();
    const templateContent = `# E2Eテスト戦略: ${targetPhase}

## 概要

${targetPhase} フェーズのE2Eテスト戦略テンプレートです。
生成日時: ${generatedAt}

## テスト対象シナリオ

- [ ] ユーザー操作の正常フロー
- [ ] エラーハンドリングフロー
- [ ] 境界値・エッジケース

## テスト実行方針

| 項目 | 内容 |
|------|------|
| フレームワーク | Vitest (ユニット/統合), Playwright (E2E) |
| 実行タイミング | PR時・スケジュール実行 |
| 合格基準 | 全テストPASS、カバレッジ90%以上 |

## シードデータ要件

（チームで定義すること）

## テスト環境設定

（チームで定義すること）
`;

    if (templateContent.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-210', 'templateContent は空文字不可です');
    }

    return new E2EStrategyTemplate({ templateContent, targetPhase, generatedAt });
  }
}
