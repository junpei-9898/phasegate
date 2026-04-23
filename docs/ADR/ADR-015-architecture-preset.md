# ADR-015: アーキテクチャスタイルを preset 化し、PhaseGate を複数アーキに対応させる

## Status

Accepted — 2026-04-23

## Context

PhaseGate は「AI 非依存の品質防御ツールキット」を標榜するが、L1 層（Biome AST rule）の依存方向検査は Clean Architecture 4 層（`domain / application / infrastructure / presentation`）を前提として**ハードコード**されている。

### ハードコードの実体（ISSUE-014 発見契機）

**`scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:6`**:

```typescript
export type LayerNameValue = 'domain' | 'application' | 'infrastructure' | 'presentation';
```

**同ファイル:15-20**（ADR-014 適用後）:

```typescript
const ALLOWED_DEPENDENCIES = {
  domain:         ['domain'],
  application:    ['application', 'domain'],
  infrastructure: ['infrastructure', 'application', 'domain'],
  presentation:   ['presentation', 'application', 'domain'],
};
```

層名・依存方向のいずれもコード内固定で、`phasegate.config.json` から変更する手段がない。

### 影響範囲

| 導入対象 PJ | 発生する摩擦 |
|---|---|
| Onion（`domain / application / interface`） | `@layer interface` で `InvalidLayerNameError` |
| Hexagonal（`core / ports / adapters`） | 層名が全て未知、L1-001/L1-002 全件違反 |
| MVC / N-tier（`controller / service / repository`） | L1-003/L1-004 が無意味に発火 |
| Flat スクリプト・CLI ツール | `@layer` 強制が過剰 |
| 既存 PJ への retrofit（ISSUE-007） | baseline で grandfather できるが、新規ファイルに Clean 形状を強制 |

「AI 非依存」という標語は達成済みだが、「Clean Architecture 前提」という暗黙制約が残存しており、PhaseGate の採用範囲を狭めている。

### 関連する先行決定

- **ADR-005** — Hexagonal Architecture の採用。PhaseGate 自身の構造的選択としては維持
- **ADR-014** — `presentation → domain` を Robert C. Martin 版 Clean Architecture 解釈で許容。本 ADR と整合（`clean` preset の既定挙動として組み込み）

## Decision

`phasegate.config.json` に `architecture` セクションを新設し、**アーキテクチャスタイルを preset ベースで選択可能**にする。

### schema v3 概要

```json
{
  "architecture": {
    "preset": "clean",
    "layers": ["domain", "application", "infrastructure", "presentation"],
    "allowedDependencies": {
      "domain":         ["domain"],
      "application":    ["application", "domain"],
      "infrastructure": ["infrastructure", "application", "domain"],
      "presentation":   ["presentation", "application", "domain"]
    },
    "metadataTags": {
      "layer": "@layer",
      "unit":  "@unit"
    },
    "layerDetection": {
      "byPath": true,
      "byTag":  true
    }
  }
}
```

`preset` を指定すれば層構成と依存規則がプリセットから注入され、`custom` 選択時のみ `layers` / `allowedDependencies` のユーザー定義が必須となる。

詳細なスキーマ案と各 preset の層・依存定義は [`docs/inception/issues/ISSUE-014/wave1_schema_proposal.md`](../inception/issues/ISSUE-014/wave1_schema_proposal.md) を参照。

### 採用する preset（6 種）

| `preset` | 層構成 | 想定用途 |
|---|---|---|
| `clean`（default） | domain / application / infrastructure / presentation | 大規模 BE、DDD 採用 PJ（PhaseGate 自身の構造、ADR-014 準拠） |
| `strict-ddd` | 同上（依存ルールのみ厳格） | Presentation → Domain 直接依存を禁じたい PJ（ADR-014 opt-out） |
| `onion` | domain / application / interface | Onion Architecture PJ |
| `hexagonal` | core / ports / adapters | Ports & Adapters 採用 PJ |
| `layered` | controller / service / repository | MVC / N-tier PJ |
| `flat` | (層なし) | 小規模スクリプト、CLI ツール、プロトタイプ |
| `custom` | ユーザー定義 | 独自アーキ |

### `flat` preset の挙動

層関連 L1 rule を自動で無効化し、汎用 rule のみ残す:

| rule | flat での挙動 |
|---|---|
| L1-001 require-unit-comment | 自動無効化 |
| L1-002 require-layer-comment | 自動無効化 |
| L1-003 no-layer-violation | 自動無効化 |
| L1-004 enforce-folder-structure | 自動無効化 |
| L1-005 no-any-abuse | 有効維持 |
| L1-006 no-ghost-file | 有効維持 |
| L1-007 no-comment-flood | 有効維持 |
| L1-008 no-code-duplication | 有効維持 |

### メタデータタグの可変化

`@layer` / `@unit` というタグ名自体も `metadataTags` で差し替え可能とする。これにより、社内規約で `@tier` / `@module` 等を使う PJ にも対応できる。

### 下位互換戦略

- **schema v2 → v3 自動マイグレーション**: `architecture` セクション未指定時は `preset: "clean"` 相当のデフォルトが自動適用される（挙動不変）
- **Phase 毎 rollout**: Wave 2〜6 で段階的に `LayerName` / `LayerBoundary` / schema validator を移行。各 Wave 独立にリリース可能
- **PhaseGate レポ自身**: `preset: "clean"` 明示（ドッグフード）

## Consequences

### ポジティブ

- Onion / Hexagonal / MVC / 小規模スクリプトなど、Clean 以外のアーキを採用する PJ への導入障壁が消滅
- retrofit-adoption（ISSUE-007）の延長で「既存アーキを尊重しつつ PhaseGate を被せる」ユースケースが成立
- メタデータタグ可変化で社内規約と衝突せず導入可能
- ADR-014（`presentation → domain` 許容）の厳格派向け opt-out が `strict-ddd` preset として提供可能になる（Philosophical tension の解消）

### ネガティブ / トレードオフ

- **実装負荷**: `LayerName` / `LayerBoundary` / `biome-ast-engine` 配下の全 rule が config 注入を受けるため、影響範囲は広い（推定 ~4d、Wave 分割で管理）
- **preset の選定判断コスト**: 導入 PJ 側が「どの preset を選ぶか」を初回に判断する必要がある
  - **緩和策**: README / retrofit-adoption.md に preset 選定フローチャートを追加（Wave 6）
- **フレームワーク固有構造（Django apps/, Rails MVC 等）の自動検出は非対応**: 層名とパス対応は `architecture.layers` で宣言ベース
  - **判断**: 自動検出は phasegate の「明示的な品質防御」哲学と整合しない。宣言を強制する方が誤検出が少ない

### スコープ外（本 ADR で扱わない）

- フレームワーク固有の自動層推論（Django / Rails / NestJS 等）
- ランタイム強制（依存方向違反の実行時 throw）— lint 時のみ
- 既存コードの層名リネーム自動変換ツール（`@layer domain` → `@tier core` 等）
- DDD 戦術パターン（Aggregate / Repository / UseCase 命名規約）の preset 化 — 別 issue

## Migration

schema v3 移行の詳細は Wave 2 で `config-foundation` の migration script として実装する。本 ADR 時点での移行方針:

1. `architecture` セクション未指定 → `preset: "clean"` を暗黙適用（既存挙動維持）
2. `architecture.preset` のみ指定 → preset から layers / allowedDependencies を展開
3. `architecture.preset: "custom"` → `layers` と `allowedDependencies` を必須入力として validate

## 関連

- **ADR-005** — Hexagonal Architecture 採用（PhaseGate 自身の構造として維持、他 PJ には preset 化で選択肢提供）
- **ADR-014** — `presentation → domain` 許容。`clean` preset の既定挙動として組み込み、`strict-ddd` で opt-out 提供
- **ISSUE-014** — 本 ADR を駆動する issue。Wave 分割実装（Wave 1: 本 ADR + schema 設計, Wave 2: LayerName 注入, Wave 3: schema v3 実装, Wave 4: dogfood, Wave 5: custom/ドキュメント）
- **ISSUE-007 retrofit-adoption** — 既存 PJ への phasegate 導入。本 ADR により Clean 以外でも受け入れ可能になり、retrofit の適用範囲が拡大
- **`scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:6,15-20`** — 現状のハードコード実体、Wave 2 の改修対象
- **`scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json`** — schema v3 の拡張対象、Wave 3 で改修
