---
adr_id: "015"
title: "アーキテクチャスタイルを preset 化し、PhaseGate を複数アーキに対応させる"
status: Accepted
date: 2026-04-23
---

# アーキテクチャスタイルを preset 化し、PhaseGate を複数アーキに対応させる

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

### 採用する preset（7 種）

| `preset` | 層構成 | 想定用途 |
|---|---|---|
| `clean`（default） | domain / application / infrastructure / presentation | 大規模 BE、DDD 採用 PJ（PhaseGate 自身の構造、ADR-014 準拠） |
| `strict-ddd` | 同上（依存ルールのみ厳格） | Presentation → Domain 直接依存を禁じたい PJ（ADR-014 opt-out） |
| `onion` | domain / application / interface | Onion Architecture PJ |
| `hexagonal` | core / ports / adapters | Ports & Adapters 採用 PJ |
| `layered` | controller / service / repository | MVC / N-tier PJ |
| `flat` | (層なし) | 小規模スクリプト、CLI ツール、プロトタイプ |
| `custom` | ユーザー定義 | 独自アーキ |

### `project.preset` との関係（直交）

既存 schema v2 には `project.preset: "minimal" | "standard" | "strict"` が存在するが、本 ADR で追加する `architecture.preset` とは**完全に直交**する概念である:

| 既存 `project.preset` | 新設 `architecture.preset` |
|---|---|
| L0〜L4 レイヤー**各防御段**の有効化プリセット（どの validator を使うか） | 依存方向検査の**アーキスタイル**プリセット（どの層構成を採るか） |
| 例: `strict` = L0-L4 全有効 | 例: `clean` = 4 層 Clean Architecture |

両者は独立に選択可能で、例えば `project.preset: "minimal"` + `architecture.preset: "hexagonal"` の組み合わせは有効。混同を避けるため、ドキュメント・CLI メッセージでは「防御プリセット / アーキプリセット」と区別して呼称する方針とする（Wave 6 のガイドで徹底）。

### ADR-005（Hexagonal 採用）との関係

ADR-005 では「PhaseGate は Hexagonal Architecture を採用する」と記録したが、実際のコードは `domain / application / infrastructure / presentation` の 4 層構成で、これは Clean Architecture の一般的な命名。**本 ADR は ADR-005 を否定しない**：Hexagonal の「core を外部詳細から隔離する」哲学は 4 層構成でも成立し、PhaseGate の `domain` は Hexagonal の `core` に相当する。preset 名としては命名が近い `clean` を選ぶことで、ADR-005 の哲学を維持しつつ preset カテゴリにフィットさせる。外部 PJ が真に 3 層 Hexagonal（`core / ports / adapters`）で記述したい場合は `hexagonal` preset を選べる。

### preset + 明示 layers 併記時の解決規則

- **`preset: "custom"` 以外 + 明示 `layers` / `allowedDependencies`**: **ユーザー明示値が preset 既定を override** する（partial override も許容）。`preset` は「出発点」として扱われ、明示フィールドで上書きできるが、整合性は引き続き schema v3 の semantic validation で検査される
- **`preset: "custom"`**: `layers` と `allowedDependencies` は必須入力。schema validation で required として強制

### ADR-014 暗黙デフォルト変更との連続性

v0.86.0（ADR-014 適用）以降、`ALLOWED_DEPENDENCIES.presentation` に `'domain'` が追加され、既定挙動として `presentation → domain` が許容化された。本 ADR はこの挙動を `clean` preset の既定として**そのまま引き継ぐ**。v0.85.0 以前の厳格 DDD 挙動を継続したい導入 PJ は、v0.92.0 以降明示的に `architecture.preset: "strict-ddd"` を指定する必要がある点を Wave 6 ガイドで警告する。

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

> 注記（WI-274, 2026-07-16）: 上表の L1-006〜L1-008 のルール名↔コード対応は当時の記述であり、現行の canonical と異なる。現行の正しい対応は `L1-006`=`no-code-duplication` / `L1-007`=`no-ghost-file` / `L1-008`=`no-comment-flood`（WI-265 で是正済み。真実の源は `biome-ast-engine` の `rule-definition-registry.ts`）。`flat` preset で「有効維持」となる 3 ルール（重複/ghost/コメント過多）という判断自体は不変で、コード表記のみが当時 drift していた。本文は歴史記録として保存する。

### メタデータタグの可変化

`@layer` / `@unit` というタグ名自体も `metadataTags` で差し替え可能とする。これにより、社内規約で `@tier` / `@module` 等を使う PJ にも対応できる。

### 下位互換戦略

- **schema v2 → v3 識別**: 設定ファイルに明示的な `$schemaVersion` フィールドは**追加しない**（既存 config の無害変更を避ける）。代わりに**構造検出**を採用し、`architecture` キーが存在すれば v3 ロード、存在しなければ v2 互換モード（`preset: "clean"` を暗黙適用）とする。Wave 3 で loader に `detectSchemaVersion()` を実装
- **自動マイグレーション**: `architecture` セクション未指定時は `preset: "clean"` 相当のデフォルトが自動適用される（挙動不変）。ただし v0.86.0 未満から upgrade する user は ADR-014 の既定変更で暗黙に presentation→domain が許容されるため、明示的な変更通知を CHANGELOG / Wave 6 ガイドで提示
- **Phase 毎 rollout**: Wave 2〜6 で段階的に `LayerName` / `LayerBoundary` / schema validator を移行。各 Wave 独立にリリース可能
- **PhaseGate レポ自身**: `preset: "clean"` を明示設定（ドッグフード）。既存の Hexagonal 哲学（ADR-005）は `domain` 層を `core` とみなすことで整合

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

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
