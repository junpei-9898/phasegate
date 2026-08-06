---
traceability:
  initial_creation: true
work_item: WI-371
---

# TDD実装計画: WI-371（GitHub issue #43）

<!-- @work-item-id WI-371 -->

## 1. スコープ

- 対象: `quickMode.categoryOverrides` の導入と `quickMode.allowedCategories` の enum 検証
- 受け入れ基準
  - `{"docs": ["results/**"]}` を設定すると、hook / `check-change-category` CLI /
    `ci-check --quick` の 3 経路すべてで `results/**` が `docs` に分類される
  - `categoryOverrides` 未設定時の分類結果は現行と完全一致する
  - `allowedCategories` に ChangeCategory 7 値以外を書くとエラーで拒否される
- 影響する層: Domain / Infrastructure（quick-mode, config-foundation, agent-integration）
- 影響しない: Application / Presentation の公開シグネチャ、`judge()` の 3 拒否ルール本体

## 2. 前提条件検証

- `docs/product/construction/quick-mode/logical_design.md` ✅ 既存
- `docs/product/construction/quick-mode/domain_model.md` ✅ 既存
- `docs/product/construction/quick-mode/unit_test_design.md` / `it_test_design.md` ✅ 既存
- `docs/product/environment_contract.md` ✅ 既存
- ストーリー固有設計: 本ディレクトリに `logical_design.md` / `domain_model.md` /
  `unit_test_design.md` を新規作成（Phase 1 成果物）
- 判定: ✅ 実装準備完了

## 3. TDD実装順序

### WI-372: categoryOverrides

| # | 対象 | テスト（RED） | 実装（GREEN） |
|---|------|--------------|--------------|
| 1 | `CategoryOverrideRules` | UT-COR-001〜013 | `domain/value-objects/category-override-rules.ts` 新規 |
| 2 | `QuickModeConfig` | UT-QMC-018/019/023 | `categoryOverrides` フィールド追加 |
| 3 | `QuickModeJudgmentEngine` | UT-JE-OV-001〜011 | `classify` / `categorizeFile` の override 伝播 + DD-2 ガード |
| 4 | config adapter | IT-QMA-001/002 | `harness-config-quick-mode-config-adapter.ts` |
| 5 | schema / 型 | IT-SCH-002/003 | v3・v2 schema, `HarnessConfigResolvedDocument` |
| 6 | 経路一貫性 | IT-OV-001/002 | 実装変更なし（配線確認） |

### WI-373: allowedCategories enum

| # | 対象 | テスト（RED） | 実装（GREEN） |
|---|------|--------------|--------------|
| 1 | `QuickModeConfig` | UT-QMC-020/021/022 | enum 検証追加 |
| 2 | schema | IT-SCH-001 | v3・v2 schema の `enum` |
| 3 | hook fail-closed | IT-OV-003 | `quick-mode-full-mode-requirement-adapter.ts`（DD-7） |

### WI-374: ドキュメント

- `docs/guide/quick-vs-full-mode.md` 分類テーブルに override の評価位置を追記
- `docs/guide/configuration.md` に `categoryOverrides` / `allowedCategories` enum のスキーマ説明

## 4. 環境検証チェックリスト

- [x] `npm install` 実行済み
- [ ] `npm run test` 全緑
- [ ] `npx phasegate lint` 違反なし
- [ ] `npx phasegate validate --layer L2` 通過

## 5. QA

### [Question] Q1: override を組み込みルールより先に評価するか

[Answer] 先に評価する（DD-1）。ただし組み込み判定が `domain` / `api` のファイルは
override で降格できない（DD-2）。ユーザー指示により事前承認済み。

### [Question] Q2: `domain` カテゴリへの override を許すか

[Answer] 許す（DD-3）。`domain` / `api` / `feature` は既定 `allowedCategories` の外にあり、
そこへの割り当ては防御の強化にしかならない。弱体化ベクトルは「割り当て元」であり DD-2 が塞ぐ。

### [Question] Q3: enum 検証が hook の fail-open と衝突しないか

[Answer] 衝突する。`QuickModeConfigError` に限り fail-closed へ倒す（DD-7 / LD-11）。

## 6. 前提条件・リスク

- **リスク**: `allowedCategories` の enum 検証はダウンストリーム消費者の既存 config を
  壊す可能性がある。ただし repo 内の全 preset（minimal / standard / strict）と
  `phasegate.config.json` は 7 値のみを使用しており影響なし
- **リスク**: `normalizeAllowedCategories`（session.json）と混同しないこと。
  session は config ではないため本 WI では触らない
- **競合注意**: 同 unit を触る別ブランチ（issue #44）と
  `quick-mode-judgment-engine.ts` / `harness-config-v3.schema.json` が競合しうる
