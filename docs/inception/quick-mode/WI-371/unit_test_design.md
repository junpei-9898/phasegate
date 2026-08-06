---
traceability:
  initial_creation: true
work_item: WI-371
---

# ストーリー固有ユニットテスト設計: WI-371

<!-- @work-item-id WI-371 -->

> Unit: quick-mode
> 親: `docs/product/construction/quick-mode/unit_test_design.md`
> 規約: Vitest / AAA / ケース名は日本語 / ドメイン層はモックしない

---

## 1. CategoryOverrideRules（`__tests__/unit/quick-mode/domain/value-objects/category-override-rules.test.ts`）

| ID | ケース | 期待 |
|----|--------|------|
| UT-COR-001 | `create(undefined)` が空ルールを返す | `isEmpty() === true` |
| UT-COR-002 | `create({})` が空ルールを返す | `isEmpty() === true` |
| UT-COR-003 | `docs: ["results/**"]` で `results/a.md` を解決 | `docs` |
| UT-COR-004 | `docs: ["results/**"]` で `results/nested/deep/a.md` を解決 | `docs`（`**` は `/` を跨ぐ） |
| UT-COR-005 | `docs: ["notes/*.md"]` で `notes/nested/a.md` を解決 | `null`（`*` は `/` を跨がない） |
| UT-COR-006 | 非マッチのパス | `null` |
| UT-COR-007 | `?` が `/` 以外の 1 文字にマッチ | `docs` |
| UT-COR-008 | 正規表現メタ文字（`.` `+`）をリテラル扱いする | 意図しないパスにマッチしない |
| UT-COR-009 | 複数カテゴリが同一パスにマッチした場合はリスク最大を採る | `api`（`docs` と `api` 両方にマッチ） |
| UT-COR-010 | 未知カテゴリキー | `QuickModeConfigError` |
| UT-COR-011 | 値が配列でない | `QuickModeConfigError` |
| UT-COR-012 | 空文字列パターンを含む | `QuickModeConfigError` |
| UT-COR-013 | 生成後の凍結（プロパティ再代入不可） | `TypeError` |

## 2. QuickModeConfig（既存 `quick-mode-config.test.ts` へ追記）

| ID | ケース | 期待 |
|----|--------|------|
| UT-QMC-018 | `categoryOverrides` 未指定時は空ルール | `categoryOverrides.isEmpty() === true` |
| UT-QMC-019 | `categoryOverrides` 指定時に保持される | `resolve('results/a.md') === 'docs'` |
| UT-QMC-020 | `allowedCategories` に未知値 `"typoo"` | `QuickModeConfigError` |
| UT-QMC-021 | `allowedCategories` に `"Docs"`（大文字） | `QuickModeConfigError`（正規化しない） |
| UT-QMC-022 | ChangeCategory 7 値すべてを受理する | 例外なし |
| UT-QMC-023 | `equals` が `categoryOverrides` の差を検出する | `false` |

## 3. QuickModeJudgmentEngine（既存 `quick-mode-judgment-engine.test.ts` へ追記）

| ID | ケース | 期待 |
|----|--------|------|
| UT-JE-OV-001 | override 未設定時、代表的な 8 パスの分類が現行と一致（**回帰固定**） | 現行の期待カテゴリ表と完全一致 |
| UT-JE-OV-002 | `docs: ["results/**"]` で `results/a.md` の CREATE が `docs` | `feature` ではなく `docs` |
| UT-JE-OV-003 | `docs: ["notes/**"]` で `notes/x.config.json` が `docs`（DD-1: override 先行） | `config` ではなく `docs` |
| UT-JE-OV-004 | `docs: ["scripts/**/domain/**"]` で domain ファイルは降格しない（DD-2） | `domain` |
| UT-JE-OV-005 | `docs: ["**/*port.ts"]` で port ファイルは降格しない（DD-2） | `api` |
| UT-JE-OV-006 | `api: ["scripts/**/domain/**"]` は昇格として許可（DD-2） | `api` |
| UT-JE-OV-007 | `domain: ["vendor/**"]` で `vendor/x.md` が `domain`（DD-3） | `domain` |
| UT-JE-OV-008 | override 適用後も `judge` の NEW_DOMAIN は発火する（DD-6） | `rejectionRule === 'NEW_DOMAIN'` |
| UT-JE-OV-009 | override 適用後も `judge` の API_CONTRACT は発火する（DD-6） | `rejectionRule === 'API_CONTRACT'` |
| UT-JE-OV-010 | `docs: ["results/**"]` かつ `allowedCategories` に `docs` 含む場合 `judge` が eligible | `isEligible() === true` |
| UT-JE-OV-011 | `judge` の遮断メッセージのカテゴリ表記が override 後カテゴリと一致 | メッセージに `category=docs` 等 |

## 4. HarnessConfigQuickModeConfigAdapter（integration）

| ID | ケース | 期待 |
|----|--------|------|
| IT-QMA-001 | `quickMode.categoryOverrides` を含む config を読み込む | `config.categoryOverrides.resolve(...)` が解決する |
| IT-QMA-002 | `quickMode` 省略時の既定に `categoryOverrides` 空が含まれる | `isEmpty() === true` |
| IT-QMA-003 | `allowedCategories` に未知値を含む config | `QuickModeConfigError` |

## 5. 経路一貫性（integration）

| ID | ケース | 期待 |
|----|--------|------|
| IT-OV-001 | hook 経路（pre-tool-use）で `results/**` → docs override が効く | 書き込みがブロックされない |
| IT-OV-002 | CLI 経路（`check-change-category --paths results/a.md --json`）で override が効く | `perFile[0].category === 'docs'` |
| IT-OV-003 | 不正 `allowedCategories` の config で hook が fail-closed（DD-7） | ブロックされる |

## 6. JSON schema（integration: `ajv-config-schema-validator-v3.test.ts`）

| ID | ケース | 期待 |
|----|--------|------|
| IT-SCH-001 | `allowedCategories: ["typoo"]` | schema 検証エラー |
| IT-SCH-002 | `categoryOverrides: { "docs": ["results/**"] }` | 検証成功 |
| IT-SCH-003 | `categoryOverrides: { "unknown": [...] }` | schema 検証エラー |
