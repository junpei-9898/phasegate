---
id: WI-327
type: fix
severity: normal
status: implemented
source: verification-followup
---

# WI-327: 最小 config（project のみ）を L1-001 で拒否しない — top-level required の緩和

## Context

手書きの `phasegate.config.json` の schema（`harness-config-v2.schema.json` /
`harness-config-v3.schema.json`）が top-level の 8 セクション
（project / layers / quickMode / phaseDependencies / planningMode / harnesses / paths / reporting）
を required にしていたため、最小構成

```json
{ "project": { "name": "myapp", "preset": "standard" } }
```

で書くと L1-001 の required エラーが 7 件連発し、validate / hook / status が exit 2 で
全滅していた。一方でプリセット解決層（`PresetResolutionService` の deepMerge）は
省略セクションを防御プリセットのデフォルト値で補完するロジックを最初から持っており、
バリデーションだけが解決前の生ドキュメントに full boilerplate を要求していた。

## 修正方針

案 (a) を採用: schema の top-level `required` を `["project"]` に緩和し、
省略されたセクションは既存のプリセット解決層（deepMerge: override が undefined なら
プリセット定義を deepClone）にデフォルト補完させる。補完ロジックは既存のまま無変更。

- `project` 自体、および `project.name` / `project.preset` の必須性は維持
- **書かれているキーの検証は一切緩めない**: セクションが存在する場合の
  セクション内 required（例: `reporting.outputDir`）・型・enum 検証は従来どおり
- `HarnessConfigSourceDocument` の該当セクションを optional 化し、型を実態に一致させる

## Acceptance Criteria

- [x] `{"project": {"name": "...", "preset": "..."}}` だけの最小 config で
      `validate --layer L2` が L1-001 required エラーなしで実行される（v2 / v3 両形式）
- [x] 省略セクションの解決結果が防御プリセットのデフォルト値と一致する（ユニットテストで固定）
- [x] 書かれているが型・値が不正なキーは従来どおり L1-001 で exit 2（検証を弱めない）
- [x] spawn レベル E2E: temp dir に最小 config だけ置いて実 CLI を起動し、
      required エラーが出ない・不正値は exit 2 のままであることを確認
      （`minimal-config-cli.integration.test.ts`）

## 変更ファイル

- `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json`
- `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json`
- `scripts/harness/config-foundation/domain/harness-config.ts`（source document 型の optional 化）
- `scripts/harness/__tests__/integration/config-foundation/ajv-config-schema-validator-v3.test.ts`
- `scripts/harness/__tests__/integration/config-foundation/minimal-config-preset-resolution.integration.test.ts`（新規）
- `scripts/harness/__tests__/integration/config-foundation/minimal-config-cli.integration.test.ts`（新規 spawn E2E）
- `scripts/harness/__tests__/unit/config-foundation/harness-config.test.ts`（fixture 型追随）
- `scripts/harness/__tests__/unit/config-foundation/preset-resolution-service.test.ts`（fixture 型追随）
