# ISSUE-014: アーキテクチャスタイルが Clean Architecture 4 層でハードコードされており、他スタイルの PJ に導入できない

## ステータス

- **状態**: 🟡 **IN PROGRESS**（Wave 1 完了 / 2026-04-23）
  - Wave 1 (v0.92.0): ADR-015 起票 + `docs/inception/issues/ISSUE-014/wave1_schema_proposal.md` で preset schema 設計を完了
  - Wave 2 以降: `LayerName` VO の config 注入改修 → schema v3 実装 → preset 実装 → dogfood → ガイド追記（各 Wave の詳細は wave1_schema_proposal.md §4 参照）
- **優先度**: P2
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

- [x] **Wave 1**: ADR-015 起票 + preset schema 設計（`wave1_schema_proposal.md`）
- [ ] `phasegate.config.json` に `architecture` セクションが追加される（schema v3 相当）
- [ ] `architecture.preset` が `clean / strict-ddd / onion / hexagonal / layered / flat / custom` の **7 種**をサポート
- [ ] `LayerNameValue` / `ALLOWED_DEPENDENCIES` が config からの注入ベースに改修される
- [ ] `@layer` タグ名自体を `metadataTags.layer` で差し替え可能（`@tier` 等）
- [ ] `flat` プリセットで L1-001〜004 が自動無効化される
- [ ] 既存の phasegate 自身（PhaseGate レポ）で `preset: "clean"` 設定に自動マイグレーション（構造検出による下位互換）
- [ ] オニオン / ヘキサゴナル / flat の各プリセットで dogfood 実証（`/tmp/phasegate-dogfood-onion/` 等、Wave 5 で最低 3 preset）
- [ ] README.md / retrofit-adoption.md に「既存 PJ のアーキに合わせて preset を選ぶ」ガイドを追加
- [ ] v0.85.0 以前からの upgrade user に ADR-014 デフォルト変更（presentation → domain 許容化）を明示警告

## 非対象（スコープ外）

- **フレームワーク固有知識**（Django の apps/ 構造、Rails の MVC 構造等）の自動検出 — 層名とパスの対応は `architecture.layers` で宣言させる
- **ランタイム強制**（依存方向違反を実行時に throw する） — あくまで lint 時チェック
- **既存層の renaming migration tool** — 既存 `@layer domain` を `@tier core` に変える等の自動変換は別 issue
- **DDD 戦術パターンの強制**（Aggregate / Repository / UseCase 等の命名規約） — 別 issue

## 推奨実装順

Wave 1 で Phase B（schema 設計）を先行実施したため、Wave 番号と Phase 番号の対応は下記の通り再整理する（元の Phase A〜F は wave1_schema_proposal.md §4 に合わせて更新済）:

| Wave | 旧 Phase | スコープ | 推定 |
|---|---|---|---|
| Wave 1 | Phase B | ADR-015 + schema 設計 + 批判的レビュー補修 | 0.5d |
| Wave 2 | Phase A | `LayerName` 注入 + phasegate 自身の `architecture: { preset: "clean" }` 明示 | 1d |
| Wave 3 | —（新設） | schema v3 JSON Schema 実体化 + 構造検出ロード + preset override 解決 + semantic validation (C1〜C5) + layerDetection precedence | 1.5d |
| Wave 4 | Phase C | `flat` preset 実装 + 残存 tag 扱い + preset/user 優先度 | 0.5d |
| Wave 5 | Phase D + E | `onion / hexagonal / layered / strict-ddd / custom` + dogfood 検証 | 1d |
| Wave 6 | Phase F | ガイド追記 + 呼称分離ガイド + `migrate` CLI + v0.86.0 境界警告 | 0.5d |

**合計 ~5d**（旧推定 +1d — Wave 3 に semantic validation 5 制約 + precedence + override を盛り込んだため 1d → 1.5d）

詳細な Wave 分割と成果物定義は [`wave1_schema_proposal.md`](./wave1_schema_proposal.md) §4 を参照。

## 関連

- `scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:6,15-20` — 現状のハードコード実体
- `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json` — 拡張対象
- ISSUE-003 Wave 0 インベントリ（`/tmp/lint-issue003-inventory.md`）— 発見契機
- ISSUE-007（retrofit-adoption）— 「Clean 前提の押し付け」が retrofit 導入障壁の一因
- CLAUDE.md の「Clean Architecture — `scripts/harness/` 配下が `domain / application / infrastructure / presentation` のレイヤー構造」記述 — PhaseGate 自身の設定選択として明記される
