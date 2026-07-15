---
id: WI-256
type: chore
severity: normal
status: implemented
---

# WI-256: スキルカタログ改編 30→29（planner 統合 / doc-health 統合 / release-publisher 新設）

## Context

30スキル監査の P3（ユーザー承認済みスコープ）。偵察により全結合点をマップ済み。

- `implementation-planner` を削除し、固有価値（Unit特定手順・ドメイン確認観点・API設計計画・最低出力基準）を story-implementor Phase 1 に移植
- `doc-freshness-checker` + `pointer-validator` を削除し、統合スキル `doc-health-checker` を新設（正しい CLI 名 `p2:check-freshness` / `p2:validate-pointers` を使用。旧スキルの `phasegate check-freshness` 表記は誤りだった）
- `release-publisher` を新設（version bump / タグ / `npm publish --auth-type=web` の厳格手順ガイド）

**不可侵**: `doc-freshness-checker` / `pointer-validator` は L4 バリデータ ID としても存在する
（validator-id.ts, config-foundation presets, ci-governance 実装）。削除は skills/ 配下のみ。

**既知の制約**: reconcile はバンドル外になったスキルを consumer 側で prune しない（orphan 残置）。
恒久対策（prune 機能）は後続 WI とし、本 WI では CHANGELOG に手動削除手順を明記して緩和する。

## Acceptance Criteria

- [x] skills/ から implementation-planner / doc-freshness-checker / pointer-validator が削除され、doc-health-checker（core / Verification, kind: advisory）と release-publisher（guidance / Operations, kind: advisory）が追加される
- [x] SKILL_CATEGORIES（skill-deployer.ts）と bundled-skill-selection.ts の両カタログが同期更新される
- [x] skill-corpus-conformance.test.ts の総数 30→29・lifecycle/advisory カウント・ADVISORY_SKILLS が実態どおり更新される
- [x] reconcile-handler.test.ts / skill-deployer.test.ts の implementation-planner fixture が生存スキルに差し替えられる
- [x] 全カウント文言（skills/README.md, README.md, DEVELOPMENT.md, docs/guide/installation.md, quick-vs-full-mode.md, skills-overview.md, CLAUDE.md）とカテゴリ見出し `(N skills)` の合計が 29 に一致する
- [x] implementation-planner の固有セクションが story-implementor Phase 1 に移植される
- [x] codebase-mapper 等の現行文書のクロス参照が新スキル名に更新される（歴史的記録 = ADR/inception/archive/coverage_report は不変）
- [x] CHANGELOG.md に破壊的変更（スキル削除・consumer での手動削除手順）が明記される
- [x] `npx phasegate lint` / skill-quality・setup・installation・validator-system テストが全 green
