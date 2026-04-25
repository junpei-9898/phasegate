# docs ディレクトリ管理ガイド

本ドキュメントは `docs/` 配下のドキュメント管理方針を定義します。Phasegate が「設計なしの実装を物理的に拒否する」ための **正本となる構造とアノテーション規約**を記述しています。

> WI-026 (v0.100.0..v0.104.0) で work item taxonomy が `WI-XXX` に統一されました。`docs/inception/issues/` および `docs/inception/{unit}/issues/` は **廃止済み**です。本ドキュメントは v0.105.0 以降の最新仕様で記述されています。

---

## 1. ディレクトリ構造（全体像）

```
docs/
├── ADR/                       # Architecture Decision Records
├── principles/                # 開発原則・テスト規約（immutable）
├── guide/                     # 公開ユーザーガイド
├── inception/                 # 計画・work item の一時設計（流動）
│   ├── _shared/               # 非 WI の横断計画（戦略・タスクリスト等）
│   ├── _cross/                # cross-cutting WI（複数 Unit に影響）
│   │   └── {WI-XXX}/
│   └── {unit}/                # Unit 所有の WI と Unit 横断計画
│       └── {WI-XXX}/
└── product/                   # 確定した設計成果物（累積更新・正本）
    ├── product_overview.md
    ├── user_stories.md
    ├── user_story_mapping.md
    ├── units/{unit}.md
    └── construction/{unit}/
        ├── domain_model.md
        ├── logical_design.md
        ├── uiux_design.md
        ├── unit_test_design.md
        ├── it_test_design.md
        ├── unit_test_logic.md
        ├── it_test_logic.md
        └── coverage_report.md
```

### 役割の対応

| ディレクトリ | 役割 | 寿命 |
|---|---|---|
| `ADR/` | アーキテクチャ意思決定の永続記録 | 永続（status で管理） |
| `principles/` | 全プロジェクトで遵守すべき不変ルール | 永続（変更には ADR 必須） |
| `guide/` | 利用者向け公開ドキュメント | 永続（仕様変更で追従） |
| `inception/` | 計画・調査・work item の一時設計 | 流動（実装後はアーカイブ） |
| `product/` | Unit 単位の確定設計（累積更新） | 永続（生きたドキュメント） |

---

## 2. 三階層モデル: inception → product → src

Phasegate の中核は **「inception で設計を起こし、product に確定させ、src（実装）に展開する」** という単方向のデータフローです。逆流はフェーズゲートでブロックされます。

```
docs/inception/{unit}/{WI-XXX}/   ← 一時的な計画・設計（WI ごと）
        ↓ 設計成果物の反映（@work-item-id 付きで累積更新）
docs/product/construction/{unit}/  ← 確定設計（Unit ごとの正本）
        ↕ フェーズゲート
scripts/harness/{unit}/(domain|application|infrastructure|presentation)/*.ts
```

### product docs ハブモデル（設計思想）

- **inception → product**: WI の設計成果が確定したら、対応する `product/construction/{unit}/{category}.md` に **累積更新**する（新規ファイルは作らない）
- **product → src**: ソースの phase-gate は **product docs の存在**で判定する（inception の存在では判定しない）
- **ソースと WI を直接紐付けない**: 一つのファイルに紐づく WI が増えると依存が複雑化するため、product docs を媒介させて間接的に紐付ける

---

## 3. inception/ — work item と計画の置き場

### 3.1 物理レイアウト（v0.105.0 以降）

| 配置先 | 用途 | 例 |
|---|---|---|
| `inception/_shared/` | 非 WI の横断計画・戦略・調査メモ | `oss_release_tasklist.md`, `wi-026-remediation-plan.md` |
| `inception/_cross/{WI-XXX}/` | 複数 Unit に影響する cross-cutting WI | `_cross/WI-026/`, `_cross/WI-031/` |
| `inception/{unit}/{WI-XXX}/` | 単一 Unit が所有する WI | `validator-system/WI-074/` |

> **廃止された配置**（v0.104.0 で物理削除）:
> - `docs/inception/issues/{ISSUE-XXX}/`
> - `docs/inception/{unit}/issues/{ISSUE-XXX}/`
> - `docs/inception/{unit}/{US-XXX}/`（旧 US 形式）
>
> 既存資産は `migrate work-items --apply` で `WI-XXX` レイアウトに移行済み。`legacy_id` で旧 ID の grep 互換性は維持されています。

### 3.2 WI frontmatter（必須）

各 WI の `description.md` 先頭に以下の YAML frontmatter を必須とします（L2 metadata validator が検証）:

```yaml
---
id: WI-XXX                                              # 必須: WI の一意 ID
type: story | issue | fix | refactor | chore           # 必須: 後述
severity: trivial | normal | high                       # 必須
status: drafted | reflected | implemented | tested      # PhaseGate が自動更新
affects: [unit-a, unit-b]                               # cross-unit のみ列挙。省略時は所有 Unit のみ
legacy_id: ISSUE-XXX | US-XXX | H{NN}-{NN}             # 任意: 移行用エイリアス
source: github#123 | slack | internal                   # 任意: 外部報告源
---
```

### 3.3 type による要求成果物の段階化

WI の重さに応じて、生成必須の成果物が変わります。

| `type` | inception 必須成果物 | product 反映 | 用途 |
|---|---|---|---|
| `story` | description + logical_design + domain_model + test 設計（+ uiux） | 全カテゴリ累積更新 | 新機能 |
| `issue` | description + logical_design + domain_model + 関係 test 設計 | 関係カテゴリ累積更新 | バグ・仕様不整合 |
| `refactor` | description + logical_design（構造変更の意図） | logical_design 更新 | リファクタ |
| `fix` | description.md + PR link | 関係カテゴリに `@work-item-id` 追記 | typo・依存更新等 |
| `chore` | description.md 1 行 + PR link | 不要 | 雑用 |

`fix` / `chore` は軽量パスとして提供されています。formal な US で起票するには重すぎる修正もここで証跡が残せます。

### 3.4 _shared/ の使い方

`inception/_shared/` は **WI に紐付かない計画・調査文書**を置きます。例:

- 戦略文書（`oss_public_release_strategy.md`）
- 横断 remediation 計画（`wi-026-remediation-plan.md`）
- TDD 実装計画の集約（`configurable_phase_gate_b4_tdd_plan.md`）

`_shared/` 配下の文書は WI ではないため `description.md` の frontmatter は不要ですが、L2 metadata validator が staged 時に `@story-id` または `@work-item-id` を要求します。新規作成時は `traceability.initial_creation: true` か該当する `@story-id`（catalog 登録済み H##-##）を付与してください。

---

## 4. product/ — 確定設計の正本

### 4.1 構造

```
product/
├── product_overview.md         # プロダクト全体像
├── user_stories.md             # US / WI catalog（H## ID と WI のマッピングを含む）
├── user_story_mapping.md       # MVP スコープ・優先順位
├── units/
│   ├── {unit}.md               # Unit 定義
│   └── integration_contract.md # Unit 間統合契約
└── construction/{unit}/
    ├── domain_model.md         # ドメインモデル
    ├── logical_design.md       # Hexagonal 論理設計
    ├── uiux_design.md          # UI/UX（Unit 全体で 1 ファイル）
    ├── unit_test_design.md     # ユニットテストケース設計
    ├── it_test_design.md       # IT テストケース設計
    ├── unit_test_logic.md      # ユニットテストロジック設計
    ├── it_test_logic.md        # IT テストロジック設計
    └── coverage_report.md      # カバレッジレポート
```

### 4.2 重要なルール

1. **work item ディレクトリを置かない**: `product/construction/{unit}/WI-XXX/` のような階層は作らない（NG）
2. **累積更新する**: 新しい WI の設計成果が確定したら **既存の `{category}.md` を編集**する（新規ファイル作成は禁止）
3. **`@work-item-id` で反映を宣言**: product 文書内で「この章は WI-XXX に基づく」と機械的に判定するため、該当章の冒頭に `@work-item-id WI-XXX` を記載する

### 4.3 `@work-item-id` の書き方

```markdown
<!-- product/construction/order/logical_design.md -->

## ポート定義

<!-- @work-item-id WI-042 -->
### OrderRepository Port
- findById(id: OrderId): Promise<Order>

<!-- @work-item-id WI-042, WI-051 -->
### PaymentGateway Port
- charge(amount: Money): Promise<Receipt>
```

カンマ区切りで複数 WI を 1 つのアノテーションにまとめられます。

> **legacy 互換**: 既存 product 文書の `@story-id US-XXX` / `@issue-id ISSUE-XXX` / `@story-id H##-##` は WI の `legacy_id` 経由で読み替えられます。一括置換は **しません**（履歴の対応関係を破壊しないため）。新規記述は `@work-item-id WI-XXX` を使ってください。

---

## 5. ソースコードのアノテーション規約

`scripts/harness/` 配下のソースファイル先頭に以下を記載します。

```typescript
// @unit config-foundation
// @layer domain
// @work-item-id WI-042       ← 任意（traceability に貢献）
// @story US-001              ← テストファイルのみ（legacy 互換）

export class ConfigSchema { ... }
```

| タグ | 意味 | 必須性 |
|---|---|---|
| `@unit` | このファイルが属する Unit 名 | **必須**（L1-001 が検証） |
| `@layer` | 層名（preset で定義された値） | **必須**（L1-002 が検証） |
| `@work-item-id` | このファイル変更を駆動した WI | 任意（traceability で活用） |
| `@story` | テストが検証する US / WI（legacy 互換） | テストでは推奨 |

`@layer` の有効値は `architecture.preset` で決まります（clean / onion / hexagonal / layered / strict-ddd / flat / custom）。

---

## 6. ドキュメント作成フロー（AIDLC 準拠）

WI は以下の 5 段階で進行します。各段階で配置先と PhaseGate の挙動が決まっています。

### Phase 0 — Product / 横断仕様（_cross WI のみ）

**対象**: `docs/product/product_overview.md` / `user_stories.md` / `user_story_mapping.md` / `units/*.md`

`_cross/{WI-XXX}/` かつ `type: story | issue` が戦略・スコープ・Unit 境界に影響する場合、上記いずれかに `@work-item-id WI-XXX` の反映が必要。未反映なら `affects` 全 Unit への Phase 2/3 書き込みをブロック。

### Phase 1 — Inception（下書き・探索）

**対象**: `docs/inception/{unit}/{WI-XXX}/` / `docs/inception/_cross/{WI-XXX}/`

- WI directory 作成と `description.md` 編集は自由
- 設計カテゴリ文書（`logical_design.md` 等）が新規作成・実質更新された時点で「反映義務フラグ」が立つ（`status: drafted`）
- inception 配下のパスへの書き込みは Phase 1 work であり、**Phase 3 reflection check の対象外**（v0.103.0 で確定）

### Phase 2 — Product Construction（確定設計の累積）

**対象**: `docs/product/construction/{unit}/{category}.md` / `product/*.md`

- inception の各カテゴリ文書と同カテゴリの product 文書が `@work-item-id WI-XXX` を含み、かつ実質 diff を伴う
- `_cross/` WI は `affects` 全 Unit について満たす必要あり

### Phase 3 — Implementation (TDD)

**対象**: `scripts/harness/{unit}/(domain|application|infrastructure|presentation)/*.ts`

- 当該 Unit の open な WI のうち、Phase 2 反映が未完なら実装書き込みをブロック
- `_cross/` WI の `affects` に含まれる Unit は、当該 WI の Phase 0 / 2 反映が完了するまで実装ブロック

### Phase 4 — Test

**対象**: `scripts/harness/__tests__/(unit|integration)/**/*.test.ts`

- product 側の `unit_test_design.md` / `it_test_design.md` に該当 WI の反映があること
- テストファイルの `@work-item-id` から traceability-model が WI → test カバレッジを算出

---

## 7. State Machine（WI のステータス遷移）

```
DRAFTED       inception の必要成果物が type に応じて揃っている
  ↓ (Phase 0 / Phase 2 reflection)
REFLECTED     affects 全 Unit の product に @work-item-id 反映済み
  ↓ (Phase 3 implementation)
IMPLEMENTED   scripts/harness 配下に対応実装が存在し lint/type/test green
  ↓ (Phase 4 test)
TESTED        @work-item-id 付きテストが存在し green
```

- `type: chore` は DRAFTED で完結（product 反映不要、PR trailer のみ）
- `type: fix` は DRAFTED → REFLECTED（@work-item-id の product 追記）→ IMPLEMENTED の簡略パス
- `type: story | issue | refactor` はフル状態遷移

`status` フィールドは PhaseGate が自動更新します（手動で書き換える必要はありません）。

---

## 8. WI ID 採番ルール

`migrate work-items --apply` および新規 WI 起票時の採番:

- 既存 WI 番号は予約（重複しない）
- 空き番号の **若い順**で sequential allocation
- legacy ID（`ISSUE-XXX` / `US-XXX` / `H{NN}-{NN}`）が存在する場合、frontmatter の `legacy_id` に保持

詳細は [CLI Reference — Work Item Migration](./guide/cli-reference.md#work-item-migration) を参照。

---

## 9. ファイル命名規則

| 種別 | パターン | 例 |
|---|---|---|
| WI 記述 | `description.md` | `_cross/WI-026/description.md` |
| 計画 | `*_plan.md` | `domain_model_plan.md`（inception のみ） |
| ドメインモデル | `domain_model.md` | - |
| 論理設計 | `logical_design.md` | - |
| UI/UX 設計 | `uiux_design.md` | Unit 全体で 1 ファイル |
| シナリオテスト設計 | `scenario_test_design.md` | - |
| IT テスト設計 | `it_test_design.md` | - |
| ユニットテスト設計 | `unit_test_design.md` | - |
| テストロジック設計 | `*_test_logic.md` | `unit_test_logic.md` |
| カバレッジレポート | `coverage_report.md` | - |
| Unit 定義 | `{unit}.md` | `withholding_tax.md` |
| 統合契約 | `integration_contract.md` | - |

---

## 10. アンチパターン

| NG | 理由 |
|---|---|
| `product/construction/{unit}/WI-XXX/` を作る | product は累積更新の正本。WI ディレクトリは inception のみ |
| inception/{unit}/issues/ を新規作成する | v0.104.0 で廃止。`{unit}/{WI-XXX}/` を使う |
| inception/{unit}/{US-XXX}/ を新規作成する | 旧形式。`migrate work-items` で `WI-XXX` に移行 |
| product 文書に `@story-id US-XXX` を **新規記述**する | 新規は `@work-item-id WI-XXX` を使う（legacy は読み取り互換のみ） |
| frontmatter の `status` を手動編集する | PhaseGate が自動更新する。手動上書きは状態機械を壊す |
| `_cross/{WI-XXX}/` の `affects` を省略する | cross-unit WI は必須。省略するとどの Unit の reflection check も発火しない |

---

## 関連ドキュメント

- [アーキテクチャ哲学](./principles/architecture-philosophy.md)
- [テストルール](./principles/testing-rules.md)
- [CLI Reference — Work Item Migration](./guide/cli-reference.md#work-item-migration)
- [Configuration — storyReflection / WI gate](./guide/configuration.md)
- [Layer Model](./guide/layer-model.md)
- WI 仕様の出典: [`docs/inception/_cross/WI-026/description.md`](./inception/_cross/WI-026/description.md)
