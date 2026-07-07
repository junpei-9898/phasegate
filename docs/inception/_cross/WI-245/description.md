---
id: WI-245
type: chore
severity: normal
status: drafted
---

# WI-245: スキルの npm 配信ポータビリティ統一（二段探索・パス注記・自リポジトリ前提の除去）

## Context

30スキル監査（WI-242/WI-244 に続く P2 後半バッチ）。skills/ は npm で consumer プロジェクトに
配信されるが、以下の自己ホスティング前提が残存している。ドキュメント修正のみ、コード変更なし。

1. `docs/principles/*.md` / `docs/ADR/*` への参照が consumer では `node_modules/phasegate/docs/...`
   に置かれることを考慮していない（二段探索の記載があるのは phasegate-toolkit-guide と
   phasegate-config-doctor の2スキルのみ）
2. logic-designer 群が `backend/test/**`・`pnpm --filter backend`・Supabase・`e2e/` を
   前提としてハードコード（モノレポ + Supabase 以外の consumer で誤誘導）
3. 散在する自リポジトリ視点の記述: cascade-updater の `scripts/harness/{unit}/*`、
   phasegate-config-doctor の検出例、codebase-mapper の実 Unit 名サンプル、
   ISSUE-008 / MetadataValidator 内部クラス名への参照、`pnpm test` 固定、
   codex-delegator の「ヘキサゴナル + DDD」固定注入（consumer の architecture.preset 無視）

## Acceptance Criteria

- [ ] docs/principles・docs/ADR を参照する全スキルに二段探索注記（consumer: `node_modules/phasegate/docs/...` → dogfood: `docs/...`）が入る
- [ ] logic-designer 群のテスト配置パス・パッケージマネージャ・Supabase 前提が「プロジェクト構成に応じて解決する」形に一般化され、既定例は例と明示される
- [ ] 設計文書パスを扱うスキルに「`phasegate.config.json` の paths 設定が優先」の注記が入る（全パスのトークン化はしない）
- [ ] codex-delegator のアーキテクチャ注入文言が `architecture.preset` 由来に修正される
- [ ] ISSUE-008 / MetadataValidator / 実 Unit 名サンプル / `scripts/harness/{unit}/*` 漏れ / `pnpm test` 固定が解消される
- [ ] レンダラー結合文字列・正規見出し・frontmatter は不変
- [ ] 既存 green のテストが green のまま（WI-241 WIP 失敗9件を除く）
