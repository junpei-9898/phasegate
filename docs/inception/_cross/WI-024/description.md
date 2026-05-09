---
id: WI-024
type: issue
severity: normal
status: tested
legacy_id: ISSUE-024
---

# ISSUE-024: `@layer` / `@unit` タグ名の差し替え対応（`metadataTags.layer` / `metadataTags.unit`）

## ステータス

- **状態**: 🟢 **TESTED**（実装・検証済み）
- **優先度**: P3 — architecture preset 本体とは直交。特定ドメイン用語を使いたい PJ 向け nice-to-have
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-014 Wave 1 設計時に受け入れ基準として立てたが、preset 機能（層の構造と依存方向）とは直交する機能（タグ名そのものの rename）なので別 issue に分離した

## 背景

PhaseGate の L1-001 / L1-002 ルールは、ソースファイル先頭に `// @unit <unit-id>` / `// @layer <layer-name>` という固定タグが書かれていることを要求する。ISSUE-014 Wave 1〜6 で `architecture.preset` / `architecture.layers` は設定可能になったが、**タグのキー名 `@unit` / `@layer` 自体は固定のまま**。

一部の採用候補 PJ はチーム文化として以下のようなタグ呼称を使っている:

- `@tier` — `@layer` の代替（DDD 系で "tier" 呼称を使う文化）
- `@module` — `@unit` の代替（Go 系 PJ で "module" 呼称）
- `@package` — `@unit` の代替（Java / Kotlin 系）

これらの PJ に phasegate を導入しようとすると、既存の `@tier` / `@module` タグをすべて `@layer` / `@unit` に書き換える必要があり、導入障壁になる。

## 提案

`phasegate.config.json` の `architecture.metadataTags` セクションで、L1 parser 側のタグキーを差し替えられるようにする:

```json
{
  "architecture": {
    "preset": "clean",
    "metadataTags": {
      "unit": "@module",
      "layer": "@tier"
    }
  },
  "l1": { "enabled": true }
}
```

上記設定の場合、`parseUnitComment` / `parseLayerComment` は `@module` / `@tier` を検出対象とし、`@unit` / `@layer` は検出しない（どちらも併存させるとメタデータ重複の混乱を生むため、どちらか一方のみを有効化する）。

## 実装結果

- `ArchitectureSpec` に `metadataTags` を追加し、未指定時は `@unit` / `@layer` を既定値にする
- `ResolveEnabledRulesUseCase` が config-foundation の `architecture.metadataTags` を biome-ast-engine の `ArchitectureSpec` へ透過する
- `parseUnitComment` / `parseLayerComment` は設定 tag名を引数で受け取り、その tagだけを検出する
- `TypeScriptSourceModuleAnalyzerAdapter` は `ArchitectureSpec.metadataTags` を parser へ渡す
- `LintRunner` の L1-001 / L1-002 欠落メッセージは設定 tag名を表示する
- `HarnessErrorFormatterAdapter` の L1-001 / L1-002 suggestion も設定 tag名を表示する

## 受け入れ基準

- [x] `metadataTags.unit: "@module"` 設定下で、ソースファイル `// @module foo` が L1-001 を PASS する
- [x] 同設定下で、`// @unit foo` は L1-001 を FAIL する（二重対応はしない）
- [x] 既定（`metadataTags` 省略時）では従来通り `@unit` / `@layer` が有効
- [x] エラーメッセージの `@unit` / `@layer` 文言も設定に合わせて置換される
- [x] schema v3 の JSON Schema に `metadataTags` optional が追加され、validation が通る
- [x] phasegate 自身の既存 `@unit` / `@layer` タグは影響を受けない（default 動作維持）

## 検証

- `pnpm exec tsc --noEmit`
- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/biome-ast-engine/unit-comment-parser.test.ts scripts/harness/__tests__/unit/biome-ast-engine/layer-comment-parser.test.ts scripts/harness/__tests__/unit/biome-ast-engine/architecture-spec.test.ts scripts/harness/__tests__/unit/biome-ast-engine/resolve-enabled-rules-usecase.test.ts scripts/harness/__tests__/unit/biome-ast-engine/lint-runner.test.ts scripts/harness/__tests__/integration/biome-ast-engine/typescript-source-module-analyzer-adapter.test.ts`
- `phasegate lint --json --skip-eslint-removal-check --target src/domain/example.ts` dogfood:
  - `architecture.metadataTags={ unit:"@module", layer:"@tier" }` + `// @module` / `// @tier` は `status: success`, `scannedFiles: 1`, `violationCount: 0`
  - 同設定 + 旧 `// @unit` / `// @layer` のみは `status: failure`, `L1-001 @moduleコメントが必要です`, `L1-002 @tierコメントが必要です`
- follow-up: `suggestion` も `ファイル先頭に @module コメントを追加する` / `ファイル先頭に @tier コメントを追加する` を表示する
- `phasegate validate --layer L2 --format human`
- `npm pack --pack-destination /private/tmp`（`phasegate-0.140.0.tgz`、package versionと対象 runtime files の同梱を確認）

## 非対象

- **タグ移行ツール**（既存 `@unit` を `@module` に一括置換する CLI）— `sed` / エディタ機能で十分、phasegate 側で提供しない
- **タグのエイリアス**（`@unit` と `@module` を両方有効にする）— 混乱を招くので単一のみ

## 関連

- ISSUE-014: architecture preset 対応（本 issue と直交、preset 側は CLOSED）
- `unit-comment-parser.ts` / `layer-comment-parser.ts`: 本 issue の主要改修対象
- `ADR-015`: architecture preset 決定記録（本 issue の選定と整合性確認）
