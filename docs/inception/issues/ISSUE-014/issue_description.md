# ISSUE-014: アーキテクチャスタイルが Clean Architecture 4 層でハードコードされており、他スタイルの PJ に導入できない

## ステータス

- **起票日**: 2026-04-23
- **発見契機**: ISSUE-003（lint 違反解消）Wave 0 棚卸し中に、`scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:6,15-20` で層名と依存方向が固定値としてハードコードされていることが判明。プロジェクト側でアーキテクチャスタイルを選べない
- **影響Unit**: biome-ast-engine（主）, config-foundation（schema 拡張）, validator-system（メタデータ規則）, skill-quality（L1-001/L1-002 の `@layer` タグ値）
- **深刻度**: Medium — PhaseGate の標語「AI 非依存の品質防御ツールキット」は achievement だが、「Clean Architecture 前提ツールキット」という暗黙制約があり、採用範囲が狭まっている
- **優先度**: P2 — 新規導入 PJ が Clean 以外のアーキでは lint が画一的に violation を量産する。retrofit-adoption（ISSUE-007）の延長線上で解消すべき構造的ギャップ

## 問題の概要

PhaseGate の L1 層（Biome AST rule）は Clean Architecture 4 層（`domain / application / infrastructure / presentation`）を前提とした実装になっており、プロジェクトごとのアーキテクチャスタイル選択に対応できない。

### 現状（直接確認済み）

**`scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:6`**:
```typescript
export type LayerNameValue = 'domain' | 'application' | 'infrastructure' | 'presentation';
```

**同ファイル:15-20**:
```typescript
const ALLOWED_DEPENDENCIES: Readonly<Record<LayerNameValue, readonly LayerNameValue[]>> = {
  domain:         ['domain'],
  application:    ['application', 'domain'],
  infrastructure: ['infrastructure', 'application', 'domain'],
  presentation:   ['presentation', 'application'],
};
```

層の種類・依存方向のいずれもコード内固定で、`phasegate.config.json` から変更できない。

### 影響を受ける現実シナリオ

| シナリオ | 影響 |
|---|---|
| オニオンアーキ（`domain / application / interface` 3 層）PJ | `@layer interface` が `InvalidLayerNameError` で弾かれる |
| ヘキサゴナル（`core / ports / adapters`）PJ | 層名全体が未知、`L1-001/L1-002` 全件違反 |
| Django / Rails 等の MVC フレームワーク PJ | 層概念が異なり、L1-003/L1-004 が無意味に発火 |
| 小規模スクリプト・CLI ツール（層分割なし） | `@layer` タグ強制が過剰、全ファイル違反 |
| 既存 PJ への retrofit 導入（ISSUE-007 の範疇） | baseline で grandfather できるが、新規ファイルに Clean 形状を強制される |

### ISSUE-003 との関係

ISSUE-003 Wave 0 棚卸しで発覚した 5 件の設計判断候補のうち、**項目 5（`import type` のみ参照の DTO/port を ghost と扱うか）** と **項目 2（hook の DI root 化）** は、アーキスタイル固定が間接要因。本 issue で選択肢を広げれば、ISSUE-003 の一部違反は「異なるスタイル選択」で解消される余地がある。

ただし ISSUE-003 は既存の Clean 前提コードの lint 違反解消が目的で、本 issue は将来のアーキ選択肢の提供が目的。**スコープ分離**して並行進行する。

## 修正案: `phasegate.config.json` への architecture セクション追加

### 設定スキーマ（案）

```json
{
  "architecture": {
    "preset": "clean",
    "layers": ["domain", "application", "infrastructure", "presentation"],
    "allowedDependencies": {
      "domain":         ["domain"],
      "application":    ["application", "domain"],
      "infrastructure": ["infrastructure", "application", "domain"],
      "presentation":   ["presentation", "application"]
    },
    "metadataTags": {
      "layer":    "@layer",
      "unit":     "@unit"
    },
    "layerDetection": {
      "byPath": true,
      "byTag": true
    }
  }
}
```

### プリセット（案）

| `preset` | 層構成 | 想定用途 |
|---|---|---|
| `clean`（default） | domain / application / infrastructure / presentation | 大規模 BE、DDD 採用 PJ（現状） |
| `onion` | domain / application / interface | Onion Architecture PJ |
| `hexagonal` | core / ports / adapters | Ports & Adapters 採用 PJ |
| `layered` | controller / service / repository | MVC / N-tier PJ |
| `flat` | (層なし) | 小規模スクリプト、CLI ツール、プロトタイプ |
| `custom` | `layers` と `allowedDependencies` をユーザー定義 | 独自アーキ |

### `flat` プリセットの挙動

- `L1-001 require-unit-comment` / `L1-002 require-layer-comment` を自動無効化
- `L1-003 no-layer-violation` / `L1-004 enforce-folder-structure` を自動無効化
- 残り L1 rule（`L1-005 no-any-abuse` / `L1-006 no-ghost-file` / `L1-007 no-comment-flood` / `L1-008 no-code-duplication`）は引き続き有効

## 受け入れ基準

- [ ] `phasegate.config.json` に `architecture` セクションが追加される（schema v3 相当）
- [ ] `architecture.preset` が `clean / onion / hexagonal / layered / flat / custom` をサポート
- [ ] `LayerNameValue` / `ALLOWED_DEPENDENCIES` が config からの注入ベースに改修される
- [ ] `@layer` タグ名自体を `metadataTags.layer` で差し替え可能（`@tier` 等）
- [ ] `flat` プリセットで L1-001〜004 が自動無効化される
- [ ] 既存の phasegate 自身（PhaseGate レポ）で `preset: "clean"` 設定に自動マイグレーション（schema version bump で下位互換）
- [ ] オニオン / ヘキサゴナル / flat の各プリセットで dogfood 実証（`/tmp/phasegate-dogfood-onion/` 等）
- [ ] README.md / retrofit-adoption.md に「既存 PJ のアーキに合わせて preset を選ぶ」ガイドを追加

## 非対象（スコープ外）

- **フレームワーク固有知識**（Django の apps/ 構造、Rails の MVC 構造等）の自動検出 — 層名とパスの対応は `architecture.layers` で宣言させる
- **ランタイム強制**（依存方向違反を実行時に throw する） — あくまで lint 時チェック
- **既存層の renaming migration tool** — 既存 `@layer domain` を `@tier core` に変える等の自動変換は別 issue
- **DDD 戦術パターンの強制**（Aggregate / Repository / UseCase 等の命名規約） — 別 issue

## 推奨実装順

1. **Phase A（1d）**: `LayerNameValue` を config 注入形式に改修。既存挙動を `preset: "clean"` で再現
2. **Phase B（0.5d）**: schema v3 の設計 + `architecture` セクション定義 + 下位互換マイグレーション
3. **Phase C（0.5d）**: `flat` プリセット（層関連 rule 無効化）
4. **Phase D（1d）**: `onion / hexagonal / layered` プリセット + それぞれの dogfood
5. **Phase E（0.5d）**: `custom` プリセット + validation
6. **Phase F（0.5d）**: README / retrofit-adoption.md / CLAUDE.md のガイド追記

**合計 ~4d**

## 関連

- `scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:6,15-20` — 現状のハードコード実体
- `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json` — 拡張対象
- ISSUE-003 Wave 0 インベントリ（`/tmp/lint-issue003-inventory.md`）— 発見契機
- ISSUE-007（retrofit-adoption）— 「Clean 前提の押し付け」が retrofit 導入障壁の一因
- CLAUDE.md の「Clean Architecture — `scripts/harness/` 配下が `domain / application / infrastructure / presentation` のレイヤー構造」記述 — PhaseGate 自身の設定選択として明記される
