# ISSUE-024: `@layer` / `@unit` タグ名の差し替え対応（`metadataTags.layer` / `metadataTags.unit`）

## ステータス

- **状態**: 🔴 **OPEN**（未着手）
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

`phasegate.config.json` に `metadataTags` セクションを追加し、L1 parser 側でタグキーを differently 扱えるようにする:

```json
{
  "architecture": {
    "preset": "clean"
  },
  "metadataTags": {
    "unit": "@module",
    "layer": "@tier"
  },
  "l1": { "enabled": true }
}
```

上記設定の場合、`parseUnitComment` / `parseLayerComment` は `@module` / `@tier` を検出対象とし、`@unit` / `@layer` は検出しない（どちらも併存させるとメタデータ重複の混乱を生むため、どちらか一方のみを有効化する）。

## 実装観点（未着手・下書き）

- `scripts/harness/biome-ast-engine/infrastructure/parsers/unit-comment-parser.ts` に tag name 注入口を作る
- `scripts/harness/biome-ast-engine/infrastructure/parsers/layer-comment-parser.ts` も同様
- `RuleConfigProviderPort` に `getMetadataTags()` 追加、または既存 `getArchitecture()` と一緒に扱う
- schema v3 に `metadataTags` optional を追加（v3 の拡張として下位互換を保つ）
- `phasegate migrate --schema v3` では `metadataTags` は追記しない（defaults で後方互換）
- エラーメッセージの文言も置換（`@unitコメントが必要です` → `@moduleコメントが必要です` 等）

## 受け入れ基準

- [ ] `metadataTags.unit: "@module"` 設定下で、ソースファイル `// @module foo` が L1-001 を PASS する
- [ ] 同設定下で、`// @unit foo` は L1-001 を FAIL する（二重対応はしない）
- [ ] 既定（`metadataTags` 省略時）では従来通り `@unit` / `@layer` が有効
- [ ] エラーメッセージの `@unit` / `@layer` 文言も設定に合わせて置換される
- [ ] schema v3 の JSON Schema に `metadataTags` optional が追加され、validation が通る
- [ ] phasegate 自身の既存 `@unit` / `@layer` タグは影響を受けない（default 動作維持）

## 非対象

- **タグ移行ツール**（既存 `@unit` を `@module` に一括置換する CLI）— `sed` / エディタ機能で十分、phasegate 側で提供しない
- **タグのエイリアス**（`@unit` と `@module` を両方有効にする）— 混乱を招くので単一のみ

## 関連

- ISSUE-014: architecture preset 対応（本 issue と直交、preset 側は CLOSED）
- `unit-comment-parser.ts` / `layer-comment-parser.ts`: 本 issue の主要改修対象
- `ADR-015`: architecture preset 決定記録（本 issue の選定と整合性確認）
