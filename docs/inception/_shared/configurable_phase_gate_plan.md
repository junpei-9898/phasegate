# フェーズゲート設定可能化 計画書

- **作成日**: 2026-04-03
- **ステータス**: 計画中
- **関連**: OSS公開戦略 Phase 2 (v1.0.0)、skill_separation_plan.md

---

## 1. 課題

現在のフェーズゲートは `default-phase-nodes.ts` に全 15 ノード・17 依存がハードコードされており:

1. **特定ワークフロー前提** — DDD + Clean Architecture + テストピラミッドに最適化、他チームに適合しない
2. **ドキュメントパス固定** — `docs/product/construction/{unit}/logical_design.md` 等が必須条件としてハードコード
3. **スキル依存** — ゲートノードがスキル名と 1:1 紐付き、スキルを使わないチームでは機能しない
4. **段階的導入が困難** — 「全部入り」か「無効」の二択
5. **inception → product 反映の強制力がない** — US固有設計が inception に作成されても、product 文書への反映がスキル提案のみで強制されない
6. **`@unit` が単一ユニットのみ対応** — 実装ファイルが複数 Unit の設計文書に関連する場合（共有インフラ等）にマッピングできない。パーサー・バリデーター共に最初の `@unit` のみ処理

---

## 2. 現状

### 2.1 config 構造

```jsonc
// phasegate.config.json（現行）
{
  "project": { "preset": "standard" },        // L1-L4 バリデータ厳密度
  "phaseDependencies": {                       // ← Phase Gate 設定（本計画の対象）
    "preset": "default",                       // "default" | "custom" の 2 択
    "override": false,                         // true で customRules を適用
    "customRules": []                          // 現状は空
  },
  "quickMode": {
    "relaxedGates": ["phase-gate", "2-phase-execution"]  // Quick Mode 時のゲート緩和
  }
}
```

**注意**: `project.preset`（バリデータ厳密度）と `phaseDependencies.preset`（フェーズゲート構成）は別物。本計画は後者のみ対象。

### 2.2 ハードコード構造（15ノード・3レベル）

| Level | ノード数 | 粒度 | アーティファクトパス |
|-------|---------|------|-------------------|
| 1 | 4 | プロダクト全体 | `product/*.md`, `inception/_shared/*_plan.md` |
| 2 | 6 | Unit 単位 | `product/construction/{unit}/*.md`, `inception/{unit}/*_plan.md` |
| 3 | 5 | US/issue 単位 | `inception/{unit}/{storyId}/*.md` |

Level 3 依存チェーン（non-relaxable）:
```
2:logical-designer ──┐
2:domain-designer ───┤→ 3:logical-designer → 3:scenario-test-designer → 3:scenario-test-logic-designer ─┐
                                                                                                        ↓
2:it-test-designer ──┐                                              3:implementation-readiness-checker
2:unit-test-designer ┘──────────────────────────────────────────────→ ↓
                                                                3:story-implementor
```

### 2.3 パス→レベル判定（WriteTargetScope）

pre-tool-use hook が Write/Edit 対象パスからレベル・Unit・storyId を判定する:

| パスパターン | Level | unitId | storyId |
|------------|-------|--------|---------|
| `docs/product/*.md` | 1 | — | — |
| `docs/inception/_shared/*` | 1 | — | — |
| `docs/product/construction/{unit}/*` | 2 | ✓ | — |
| `docs/inception/{unit}/*_plan.md` | 2 | ✓ | — |
| `docs/inception/{unit}/{storyId}/*` | 3 | ✓ | ✓ |
| `docs/inception/{unit}/issues/{ISSUE-XXX}/*` | 3 | ✓ | ✓ |
| `scripts/harness/{unit}/*` | 3 | ✓ | — |
| `src/{unit}/*` | 3 | ✓ | — |

storyId パターン: `^[A-Z][\w]+-\d+$`（US-217, ISSUE-001, H03-01 等）

### 2.4 inception → product 反映の現状

現在、inception（US固有設計）から product（Unit全体設計）への反映は以下の状態:

- **Phase Gate**: product 文書の**存在**のみチェック。特定 storyId が反映済みかは検証しない
- **L2-002**: inception 文書内の `@story-id` を検証。product 文書のストーリー網羅性は対象外
- **cascade-updater**: 手動スキル実行で伝搬。提案のみで強制力なし
- **結果**: US が増えるほど product 文書が実態と乖離するリスクが蓄積

---

## 3. ゴール

`phaseDependencies.preset` を拡張し、チームの成熟度に応じた段階的ゲート導入を可能にする。加えて、US 積み上げ時の inception → product 反映を機械的に強制する。`@unit` を複数ユニット対応に拡張し、実装ファイルと設計文書のトレーサビリティを正確にする。

**設計原則:**
- ハードコードされたデフォルトはプリセットとして残す（後方互換）
- ゲート条件は「ファイルの存在」+ 「storyId の反映」。内容品質はスキル指示 + L2-002 事後検証で担保
- Phase Gate / L2-002 / storyReflection / cascade-updater の 4 系統がプリセット単位で連動
- `@unit` は実装ファイルと `docs/product/construction/{unit}/` のマッピング。1 ファイルが複数 Unit に所属可能

---

## 4. Phase A: プリセット拡充 + storyReflection（v1.0）

### 4.1 config 変更

```jsonc
{
  "phaseDependencies": {
    "preset": "standard",    // "full" | "standard" | "minimal" | "custom"
    "override": false,       // custom 時のみ true
    "customRules": [],       // Phase B で gates[] に置換
    "storyReflection": {     // 省略時: プリセットのデフォルト mappings を使用
      "enabled": true,
      "mappings": [...]      // 明示指定でプリセットデフォルトを上書き
    }
  }
}
```

マイグレーション: `"default"` → `"full"` として扱う（後方互換）。

### 4.2 storyReflection デフォルト mappings

各プリセットは storyReflection のデフォルト mappings を内蔵する。config で `storyReflection.mappings` を省略した場合はプリセットのデフォルトが適用され、明示指定した場合はそちらが優先される。

#### `full` プリセットのデフォルト mappings（AIDLC 推奨構成）

storyReflection の対象は **product に累積更新される設計文書のみ**。テスト設計は US 単位で inception に管理され product には累積更新されないため対象外（`folder_management_rules.md` 参照）。

```jsonc
// phaseDependencies.preset: "full" 時に暗黙適用
[
  // 設計文書（logical_design 以上の抽象度 = product に累積更新）
  { "inception": "docs/inception/{unit}/{storyId}/logical_design.md",
    "product":   "docs/product/construction/{unit}/logical_design.md",
    "required": true },
  { "inception": "docs/inception/{unit}/{storyId}/domain_model.md",
    "product":   "docs/product/construction/{unit}/domain_model.md",
    "required": true },
  // UIUX（フロントエンドがある場合、product に累積更新）
  { "inception": "docs/inception/{unit}/{storyId}/uiux_design.md",
    "product":   "docs/product/construction/{unit}/uiux_design.md",
    "required": false }
]
```

> **テスト設計が対象外の理由**: `scenario_test_design.md` は US 単位で inception に閉じる。`unit_test_design.md` / `it_test_design.md` は Phase 2 で Unit 単位に product へ作成されるが、US ごとの累積更新ではない。product に全 US のテスト情報を集約すると情報量が過大になるため、テスト設計は US/Unit 単位の管理に留める。

#### `standard` プリセットのデフォルト mappings

```jsonc
// phaseDependencies.preset: "standard" 時に暗黙適用
[
  { "inception": "docs/inception/{unit}/{storyId}/logical_design.md",
    "product":   "docs/product/construction/{unit}/logical_design.md",
    "required": true },
  { "inception": "docs/inception/{unit}/{storyId}/domain_model.md",
    "product":   "docs/product/construction/{unit}/domain_model.md",
    "required": false }
]
```

#### `minimal` プリセット

storyReflection 無効（`enabled: false`）。

#### カスタム mappings の例

```jsonc
// プリセットのデフォルトを上書きする場合
{
  "phaseDependencies": {
    "preset": "standard",
    "storyReflection": {
      "enabled": true,
      "mappings": [
        // logical_design のみ必須に絞る
        { "inception": "docs/inception/{unit}/{storyId}/logical_design.md",
          "product":   "docs/product/construction/{unit}/logical_design.md",
          "required": true }
        // 他は不要（チームの判断でプロジェクトに合わせる）
      ]
    }
  }
}
```

### 4.3 storyReflection のチェックロジック

#### 処理フロー

```
発火条件: src/{unit}/* または scripts/harness/{unit}/* への Write/Edit
  1. WriteTargetScope から unitId を解決
  2. docs/inception/{unit}/ 配下の storyId ディレクトリを列挙
  3. 各 storyId × 各 mapping について:
     - inception ファイルが存在する AND mapping.required == true
     - → product ファイル内に @story-id {storyId} が含まれているか検証
     - 含まれていない → ブロック
```

#### 発火タイミング

| フェーズ | 動作 |
|---------|------|
| inception 設計作成時 | チェックなし（設計段階は試行錯誤を許容） |
| **実装着手時**（src/ への Write） | **storyReflection 発火 → product 未反映ならブロック** |
| cascade-updater 実行後 | product 文書に @story-id 反映 → ゲート通過 |

#### エラーメッセージ

```
[L2-STORY-REFLECTION] docs/product/construction/order/logical_design.md に
@story-id US-002 が反映されていません。

inception/order/US-002/logical_design.md は存在しますが、
対応する product 文書に US-002 の設計が含まれていません。

修正方法:
  1. cascade-updater を実行して product 文書を更新
  2. または手動で logical_design.md に @story-id US-002 を追加

参照: ADR-XXX
```

### 4.4 プリセット定義（Single Source of Truth）

#### `full`（現行 default と同等 + storyReflection）

| Level | ゲートノード | 必須アーティファクト | L2-002 | storyReflection | cascade-updater |
|-------|-----------|-------------------|--------|-----------------|-----------------|
| 1 | product-architect, story-writer, story-mapper, unit-designer | 全8ファイル required | — | — | — |
| 2 | domain-designer, logical-designer, it-test-designer, unit-test-designer, it-test-logic-designer, unit-test-logic-designer | 全12ファイル required | — | — | — |
| 3 | logical-designer, scenario-test-designer, scenario-test-logic-designer, implementation-readiness-checker, story-implementor | 依存チェーンで順序強制 | **必須** | **必須**（logical_design + domain_model required, uiux optional） | **ゲート連動**（storyReflection 通過の手段） |

#### `standard`

| Level | ゲートノード | 必須アーティファクト | L2-002 | storyReflection | cascade-updater |
|-------|-----------|-------------------|--------|-----------------|-----------------|
| 1 | product-architect, story-writer | `product_overview.md`, `user_stories.md` のみ | — | — | — |
| 2 | domain-designer, logical-designer | `domain_model.md`, `logical_design.md` のみ | — | — | — |
| 3 | logical-designer のみ required、他 optional | US固有 `logical_design.md` required | **必須** | **必須**（logical_design required, domain_model optional） | **ゲート連動** |

#### `minimal`

| Level | ゲートノード | 必須アーティファクト | L2-002 | storyReflection | cascade-updater |
|-------|-----------|-------------------|--------|-----------------|-----------------|
| 1 | product-architect のみ | `product_overview_plan.md`, `product_overview.md` | — | — | — |
| 2 | logical-designer のみ | `logical_design.md` のみ required | — | — | — |
| 3 | なし | — | **無効** | **無効** | **任意** |

> `minimal` の Level 1 に product-architect を含める理由: Level 間遷移（L1→L2）は non-relaxable であり、Level 1 が空の場合 Level 2 に進めない。最低限の product overview は全プリセットで必須とする。
> `minimal` で storyReflection を無効にする理由: Phase 3 ゲートなしの状態で story 反映を強制するのは矛盾。

### 4.5 US / issue ワークフローの扱い

Phase 3 ゲートは US (`inception/{unit}/{US-XXX}/`) と issue (`inception/{unit}/issues/{ISSUE-XXX}/`) の両方に適用される。`{storyId}` は US-XXX / ISSUE-XXX いずれのフォーマットでも解決可能。

**storyReflection は US と issue で同一 mappings を適用する。** 理由: `folder_management_rules.md` の issue 処理フロー Step 4 で issue も product docs を累積更新するフローが明記されており、US と区別する根拠がない。

- `full` / `standard`: US・issue 共にゲート発火 + storyReflection 発火（同一 mappings）
- `minimal`: Phase 3 ゲートなし → storyReflection も無効

### 4.6 Quick Mode × プリセット

| プリセット | Quick Mode (`relaxedGates: ["phase-gate"]`) 時の動作 |
|-----------|---------------------------------------------------|
| `full` | Phase 1-3 全ゲート緩和。**storyReflection も緩和**。L1 + L2(metadata, test-quality) は維持 |
| `standard` | 同上 |
| `minimal` | Phase 2 ゲートのみ緩和（Phase 3・storyReflection は元々なし） |

Quick Mode の`maintainedLayers` は変更なし。Phase Gate 緩和はプリセットに関係なく `relaxedGates` で制御。

### 4.7 プリセット切替時の動作

- **厳格化**（minimal → standard）: 次回の Write/Edit から新プリセットのゲートが発火。既存ファイルは遡及検証しない（`phasegate validate` で手動検証可能）
- **緩和**（full → standard）: 即座に反映。不要になったゲートは無視される
- **制約**: `custom` へ切り替える場合は `override: true` が必須

### 4.8 `@unit` 複数ユニット対応

#### 課題

現在 `@unit` は 1 ファイル 1 ユニットの前提で設計されている。しかし共有インフラ層のファイルなど、複数 Unit の設計文書に関連する実装ファイルが存在する。`@unit` は実装ファイルと `docs/product/construction/{unit}/` のマッピングを担うため、複数 Unit への所属を正確に表現できなければトレーサビリティが不完全になる。

#### 構文

カンマ区切り（1行）と複数行の**両方をサポート**する:

```typescript
// 案1: カンマ区切り
// @unit order, payment

// 案2: 複数行
// @unit order
// @unit payment

// 案3: 混在（両方有効）
// @unit order, payment
// @unit shared-infra
// → 解決結果: ["order", "payment", "shared-infra"]
```

#### 影響箇所と変更内容

| ファイル | 現状 | 変更 |
|---------|------|------|
| `biome-ast-engine/.../unit-comment-parser.ts` | `unitName: string \| null` を返す。正規表現 `(\S+)` で単一値 | `unitNames: string[]` に変更。カンマ分割 + 複数行対応 |
| `traceability-model/.../source-metadata-parser.ts` | 行ごとに `@unit` タグを配列に追加（カンマ未分割） | カンマ区切り時に複数タグに展開。`value` は個別ユニット名 |
| `traceability-model/.../metadata-validator.ts` | `.find()` で最初の `@unit` のみ検証 | `.filter()` で全 `@unit` を検証。各ユニット名の存在チェック |
| `agent-integration/.../write-target-scope.ts` | パスベースで単一 unit を解決 | パスベース解決に加え、`@unit` アノテーションからの全 unit も解決対象に含める |
| Phase Gate チェック | 単一 unit のゲートのみチェック | **全 unit のゲートをチェック** — いずれかの unit でゲート未通過ならブロック |
| storyReflection | 単一 unit の inception/product を検証 | **全 unit の inception → product 反映を検証** |

#### Phase Gate との連携

```
ファイル: src/shared/payment-gateway.ts
アノテーション: @unit order, payment

Phase Gate チェック:
  1. @unit から ["order", "payment"] を解決
  2. docs/product/construction/order/ のゲート条件をチェック → ✅
  3. docs/product/construction/payment/ のゲート条件をチェック → ❌ (logical_design.md なし)
  → ブロック（全 unit のゲートを通過する必要がある）
```

#### storyReflection との連携

```
ファイル: src/shared/payment-gateway.ts への Write
アノテーション: @unit order, payment

storyReflection チェック:
  1. @unit から ["order", "payment"] を解決
  2. unit "order" の全 storyId × mappings をチェック → ✅
  3. unit "payment" の全 storyId × mappings をチェック → ❌ (US-005 未反映)
  → ブロック
```

#### 後方互換性

- 既存の単一 `@unit` ファイルは変更不要（`["single-unit"]` として扱われる）
- パーサーの返り値型変更は破壊的だが、内部 API のため外部影響なし

### 4.9 実装方針

1. `default-phase-nodes.ts` → `full-phase-nodes.ts` にリネーム
2. `standard-phase-nodes.ts`, `minimal-phase-nodes.ts` を新設
3. `PhaseStructure.createDefault(policy)` がプリセットに応じたノードセットをロード
4. `PhaseCustomizationPolicy.preset` を `'full' | 'standard' | 'minimal' | 'custom'` に拡張（`'default'` は `'full'` にフォールバック）
5. `HarnessConfigPhaseConfigProvider.getCustomizationPolicy()` でマッピング
6. `StoryReflectionChecker` を新設 — inception ディレクトリ列挙 + product 文書内 `@story-id` 検索
7. pre-tool-use hook に storyReflection チェックを追加（src/ への Write 時に発火）
8. `@unit` パーサー・バリデーター・Phase Gate を複数ユニット対応に拡張
9. `init --preset` オプション追加 — `npx phasegate init --name my-project --preset minimal` で初期 config のプリセットを指定可能に。省略時は `standard`

---

## 5. Phase B: カスタムゲート定義（v1.1）

ユーザーが `phasegate.config.json` でゲート条件を完全定義する。

### 5.1 config 構造

```jsonc
{
  "phaseDependencies": {
    "preset": "custom",
    "override": true,
    "gates": [
      {
        "name": "product-overview",
        "level": 1,
        "requires": [
          { "path": "docs/product/product_overview.md", "required": true }
        ],
        "blocks": ["docs/product/construction/**"]
      },
      {
        "name": "unit-design",
        "level": 2,
        "requires": [
          { "path": "docs/product/construction/{unit}/logical_design.md", "required": true },
          { "path": "docs/product/construction/{unit}/domain_model.md", "required": false }
        ],
        "blocks": ["scripts/harness/{unit}/**", "src/{unit}/**"],
        "dependsOn": ["product-overview"]
      },
      {
        "name": "story-design",
        "level": 3,
        "requires": [
          { "path": "docs/inception/{unit}/{storyId}/logical_design.md", "required": true }
        ],
        "blocks": ["scripts/harness/{unit}/**", "src/{unit}/**"],
        "dependsOn": ["unit-design"],
        "storyAnnotation": { "required": true, "tag": "@story-id" }
      }
    ],
    "storyReflection": {
      "enabled": true,
      "mappings": [...]
    }
  }
}
```

### 5.2 gates[] フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `name` | `string` | ✓ | ゲート識別名（`^[a-z][a-z0-9-]*$`） |
| `level` | `1 \| 2 \| 3` | ✓ | フェーズレベル |
| `requires` | `array` | ✓ | ゲート通過に必要なアーティファクト |
| `requires[].path` | `string` | ✓ | ファイルパス（`{unit}`, `{storyId}` プレースホルダ可） |
| `requires[].required` | `boolean` | ✓ | true=必須、false=推奨（警告のみ） |
| `blocks` | `string[]` | — | ブロック対象の glob（省略時: プリセットのデフォルト） |
| `dependsOn` | `string[]` | — | 先行ゲート名 |
| `storyAnnotation` | `object` | — | Level 3 のみ。`@story-id` 検証設定 |

### 5.3 制約

- **レベル遷移は non-relaxable**: Level 1 → 2 → 3 の順序は削除不可
- **循環依存は検出時エラー**: `dependsOn` のDAG検証を config ロード時に実行
- `{storyId}` を含むパスは Level 3 ゲートでのみ使用可能
- `storyAnnotation` 検証は既存の `ValidateDesignStoryAnnotationsUseCase`（L2-002）と統合
- `storyReflection` は `custom` プリセットでもそのまま利用可能（gates[] とは独立）

### 5.4 hook 連携

- pre-tool-use hook の対象パス判定を `blocks` glob パターンベースに変更
- `@unit` アノテーションからの unit 解決ロジックは維持
- `blocks` 未指定時は従来のデフォルト動作

---

## 6. マイルストーン

| Phase | バージョン | スコープ |
|-------|----------|---------|
| A | v1.0.0 | プリセット 4 種 + `"default"` → `"full"` マイグレーション + storyReflection + `@unit` 複数ユニット対応 + Bash 迂回対策 |
| B | v1.1.0 | `gates[]` 完全実装 + JSON Schema 拡張 |

---

## 7. 実施チェックリスト

### Phase A: プリセット拡充 + storyReflection（v1.0.0）

#### A-1. 未決事項の解決

- [x] A-1-1: `{unit}` 解決戦略の決定 → **パスベース + `@unit` アノテーション併用。`@unit` は複数ユニット対応（カンマ区切り + 複数行の両方サポート）。§4.8 参照**
- [x] A-1-2: storyReflection の対象ドキュメント範囲を決定 → **テスト設計は対象外。product に累積更新される設計文書のみ（logical_design, domain_model, uiux_design）。§4.2 参照**
- [x] A-1-3: storyReflection デフォルト mappings のハードコード方針 → **プリセットごとにハードコード。config 省略時はプリセットのデフォルトが自動適用（ゼロコンフィグ）。§4.2 参照**
- [x] A-1-4: issue (`ISSUE-XXX`) の storyReflection → **US と同一 mappings を適用。folder_management_rules.md で issue も product 累積更新フローが共通のため区別不要**
- [x] A-1-5: `init --preset` オプション → **v1.0 スコープに含める。`npx phasegate init --name my-project --preset minimal` で初期 config のプリセットを指定可能に**

#### A-2. ドメイン層（phase-dependency-model/domain） ✅ 完了 (2026-04-04)

**値オブジェクト・型の拡張:**

- [x] A-2-1: `PhaseCustomizationPolicy` の `preset` フィールドを `'full' | 'standard' | 'minimal' | 'custom'` に拡張
  - 対象: `scripts/harness/phase-dependency-model/domain/values/phase-customization-policy.ts`
  - `'default'` → `'full'` のフォールバック処理を含む
- [x] A-2-2: `StoryReflectionMapping` 値オブジェクトを新設
  - フィールド: `inception: string`, `product: string`, `required: boolean`
- [x] A-2-3: `StoryReflectionConfig` 値オブジェクトを新設
  - フィールド: `enabled: boolean`, `mappings: StoryReflectionMapping[]`

**`@unit` 複数ユニット対応（§4.8）:**

- [x] A-2-13: `unit-comment-parser.ts` を複数ユニット対応に拡張
  - 対象: `scripts/harness/biome-ast-engine/infrastructure/parsers/unit-comment-parser.ts`
  - 返り値: `unitName: string | null` → `unitNames: string[]`
  - カンマ区切り分割 + 複数行マッチ対応
- [x] A-2-14: `source-metadata-parser.ts` のカンマ区切り展開
  - 対象: `scripts/harness/traceability-model/infrastructure/parsers/source-metadata-parser.ts`
  - `@unit order, payment` → 2 つの `ParsedMetadataTag` に展開
- [x] A-2-15: `metadata-validator.ts` の全 `@unit` 検証対応
  - 対象: `scripts/harness/traceability-model/domain/services/metadata-validator.ts`
  - `.find()` → `.filter()` で全 `@unit` タグを検証
- [x] A-2-16: Phase Gate チェックを全 unit 対象に拡張 → **A-3 に委譲**（アプリケーション層の責務）
  - `WriteTargetScope` のパスベース解決 + `@unit` アノテーションからの全 unit でゲートチェック
  - いずれかの unit でゲート未通過 → ブロック

**プリセット定義:**

- [x] A-2-4: `default-phase-nodes.ts` → `full-phase-nodes.ts` にリネーム
  - 対象: `scripts/harness/phase-dependency-model/domain/definitions/default-phase-nodes.ts`
- [x] A-2-5: `standard-phase-nodes.ts` を新設（§4.4 standard 定義に基づく）
- [x] A-2-6: `minimal-phase-nodes.ts` を新設（§4.4 minimal 定義に基づく）
- [x] A-2-7: `default-phase-dependencies.ts` → `full-phase-dependencies.ts` にリネーム
  - 対象: `scripts/harness/phase-dependency-model/domain/definitions/default-phase-dependencies.ts`
- [x] A-2-8: `standard-phase-dependencies.ts` を新設
- [x] A-2-9: `minimal-phase-dependencies.ts` を新設
- [x] A-2-10: 各プリセットの storyReflection デフォルト mappings を定義ファイルに追加
  - `full-story-reflection-defaults.ts`, `standard-story-reflection-defaults.ts`

**PhaseStructure 拡張:**

- [x] A-2-11: `PhaseStructure.createDefault(policy)` をプリセット対応に拡張
  - 対象: `scripts/harness/phase-dependency-model/domain/models/phase-structure.ts`
  - `policy.preset` に応じて適切なノード・依存セットをロード

**storyReflection チェッカー:**

- [x] A-2-12: `StoryReflectionChecker` ドメインサービスを新設
  - 責務: inception ディレクトリの storyId 列挙 + product 文書内 `@story-id` 検索
  - 入力: `unitId`, `StoryReflectionConfig`, ファイルシステムポート
  - 出力: `StoryReflectionResult`（pass/fail + 不足 storyId リスト）

#### A-2.5. Bash 経由書き込みのフェーズゲート対応（緊急追加 2026-04-05）

**背景**: A-2 実施中、agent が Write ツールで pre-tool-use hook にブロックされると Bash（`cat > file`, heredoc 等）で迂回してファイルを作成する事象が発生。現在の `pre-tool-use-hook.ts` は `tool_input.file_path` ベースでパス抽出するため、Bash の書き込みを捕捉できない。これはフェーズゲートの品質防御を無効化する重大な抜け穴であり、A-3 着手前に塞ぐ必要がある。

**対象**:
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts`
- `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts`（Bash 入力対応）
- `scripts/harness/agent-integration/domain/services/`（新規: Bash コマンドパーサー）
- `.claude/settings.json`

**タスク:**

- [x] A-2.5-1: `BashWriteTargetExtractor` ドメインサービス新設
  - Bash command 文字列から書き込み先ファイルパスを抽出
  - 対応パターン: リダイレクト（`>`, `>>`）、`tee` / `tee -a`、`sed -i`、`cp`、`mv`、`touch`、heredoc（`<<EOF > file`）
  - 複合コマンド分解（`&&`, `;`, `|`）
  - クォート対応（`"path with spaces"`, `'path'`）
- [x] A-2.5-2: `pre-tool-use-hook.ts` を Bash 対応に拡張
  - `tool_name === 'Bash'` の場合、`tool_input.command` から `BashWriteTargetExtractor` で抽出
  - 抽出した `targetFilePaths` を既存の `HandlePreToolUseUseCase.execute()` に渡す
  - 既存の Write/Edit 経路は変更なし
- [x] A-2.5-3: `.claude/settings.json` の hooks.PreToolUse に Bash matcher 追加
  - `Bash` matcher にも `pre-tool-use-hook.ts` を登録
  - 既存 `deny-check.sh` と共存（両方実行）
- [x] A-2.5-4: ユニットテスト
  - `BashWriteTargetExtractor` の全パターン網羅
  - 複合コマンド・クォート・heredoc のエッジケース
- [x] A-2.5-5: 統合テスト
  - `cat > scripts/harness/{unit}/foo.ts` で protected path に書き込み → ブロック
  - 安全な Bash（`pnpm test`, `git status`, `ls`）→ 通過
  - A-2 実施中に発生した迂回パターン（cat heredoc）の回帰テスト

**検出不能ケース（将来課題）:**
- `python -c "..."`, `node -e "..."` の eval 系
- ユーザー作成スクリプトの実行（`./deploy.sh`）
- エディタ起動（`vim file`）

これらは本タスクのスコープ外。L2/L4 バリデータ等で事後検証する方針で別途検討。

**マイルストーン**: A-3 着手前に完了必須。v1.0.0 リリース前の品質防御要件。

#### A-3. アプリケーション層

- [x] A-3-1: `CheckStoryReflectionUseCase` を新設
  - `StoryReflectionChecker` をオーケストレーション
  - inception ディレクトリ列挙 → mapping ごとに product 文書検証
- [x] A-3-2: 既存の `HandlePreToolUseUseCase` に storyReflection チェックを統合
  - `src/{unit}/*` または `scripts/harness/{unit}/*` への Write/Edit 時に発火
  - Quick Mode 時は storyReflection も緩和（§4.6）

#### A-4. インフラストラクチャ層

- [x] A-4-1: `HarnessConfigPhaseConfigProvider` を拡張
  - 対象: `scripts/harness/phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.ts`
  - `phaseDependencies.preset` の新プリセット値をマッピング
  - `phaseDependencies.storyReflection` セクションをパース
  - mappings 省略時にプリセットデフォルトを適用するロジック
- [x] A-4-2: config JSON の型定義を更新
  - 対象: `scripts/harness/config-foundation/` 配下
  - `storyReflection` セクションのスキーマ定義追加
- [x] A-4-3: `FileSystemStoryReflectionAdapter` を新設
  - inception ディレクトリ列挙（`fs.readdir`）
  - product 文書内の `@story-id` パターン検索

#### A-5. プレゼンテーション層

- [x] A-5-1: pre-tool-use hook に storyReflection エラーメッセージを追加（§4.3 エラーフォーマット）
  - 対象: `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts`
- [x] A-5-2: `phasegate validate --layer L2` に storyReflection 結果を含める
- [x] A-5-3: `phasegate:status` に storyReflection 状態（有効/無効、mapping 数）を表示

#### A-6. マイグレーション

- [x] A-6-1: `"default"` → `"full"` フォールバック処理
  - 既存の `phasegate.config.json` で `"preset": "default"` のユーザーが動作を維持できること
- [x] A-6-2: `init` コマンドが新プリセット名でデフォルト config を生成するよう更新
  - 対象: `scripts/harness/setup/skill-deployer.ts` の `initHarnessConfig()`
- [x] A-6-3: `init --preset` オプション追加
  - `npx phasegate init --name my-project --preset minimal` で初期 config のプリセットを指定
  - 省略時は `standard`
  - 対象: `scripts/harness/main.ts`（引数パース）+ `skill-deployer.ts`（config 生成）
- [x] A-6-4: 既存テストの `"default"` 参照を `"full"` に更新（フォールバック経由で動作は維持）

#### A-7. テスト

- [x] A-7-1: `PhaseCustomizationPolicy` のユニットテスト — `'default'` フォールバック、全プリセット値の生成
- [x] A-7-2: `StoryReflectionChecker` のユニットテスト
  - inception 文書あり × product 未反映 → fail
  - inception 文書あり × product 反映済み → pass
  - inception 文書なし → skip（チェック不要）
  - `required: false` の mapping → 警告のみ
- [x] A-7-3: `CheckStoryReflectionUseCase` の IT テスト — 実ファイルシステムでの E2E フロー
- [x] A-7-4: `HandlePreToolUseUseCase` の統合テスト — storyReflection 発火/非発火の条件分岐
- [x] A-7-5: `HarnessConfigPhaseConfigProvider` のテスト — mappings 省略時のデフォルト適用
- [x] A-7-6: Quick Mode × storyReflection 緩和の統合テスト
- [x] A-7-7: プリセット切替（minimal → standard → full）の統合テスト
- [x] A-7-8: `unit-comment-parser` のユニットテスト — カンマ区切り、複数行、混在、単一（後方互換）
- [x] A-7-9: `source-metadata-parser` のユニットテスト — カンマ区切り `@unit` の複数タグ展開
- [x] A-7-10: `metadata-validator` のユニットテスト — 複数 `@unit` の全件検証、一部不正時のエラー
- [x] A-7-11: Phase Gate × 複数 unit の統合テスト — 全 unit ゲート通過/一部未通過のブロック動作

#### A-8. ドキュメント

- [x] A-8-1: `docs/guide/configuration.md` に storyReflection セクション追加
- [x] A-8-2: `README.md` / `README.ja.md` の Presets テーブル更新（storyReflection 列追加）
- [x] A-8-3: `docs/ADR/` に storyReflection の ADR 追加（ADR-013-story-reflection-gate.md）
- [x] A-8-4: cascade-updater の SKILL.md に「storyReflection ゲート通過の手段」であることを追記

---

### Phase B: カスタムゲート定義（v1.1.0）

#### B-1. 未決事項の解決

- [x] B-1-1: glob ライブラリ選定（minimatch / picomatch）→ **picomatch 採用**（既に transitive で v4.0.4 存在、高速、zero deps。`dependencies` に明示追加）
- [x] B-1-2: `gates[]` の JSON Schema 定義を確定 → ドラフト確定（§5.2 準拠。`level ∈ {1,2,3}`、`storyAnnotation` は Level 3 のみドメイン層で検証、DAG 循環検出は `GateGraph` で実施、`additionalProperties: false`）

#### B-2. ドメイン層

- [x] B-2-1: `GateDefinition` 値オブジェクトを新設（§5.2 フィールド定義に基づく）
- [x] B-2-2: `GateGraph` ドメインサービスを新設 — DAG 検証 + 循環依存検出
- [x] B-2-3: `PhaseStructure` を `gates[]` から動的構築できるよう拡張

#### B-3. アプリケーション層

- [x] B-3-1: `ResolveGateUseCase` を新設 — Write 対象パスを `blocks` glob でマッチング → 該当ゲートの `requires` チェック
- [x] B-3-2: `HandlePreToolUseUseCase` に `custom` プリセット時の `gates[]` ベースチェックを統合

#### B-4. インフラストラクチャ層

- [x] B-4-1: `gates[]` の config パース + バリデーション
- [x] B-4-2: glob マッチングアダプター実装（選定ライブラリのラッパー）
- [x] B-4-3: `storyAnnotation` フィールドと既存 L2-002 (`ValidateDesignStoryAnnotationsUseCase`) の統合

#### B-4.5. 配線修正（v0.23.0、2026-04-06 追加）

> B-5 着手時の前提調査で、B-4 が残した「設定ファイル → CLI/hook → phase-dependency-model」経路の配線ギャップ（5 点）を発見。CLI/hook 実運用経路では `custom` preset の `gates[]` が無言で脱落していた。`composition-root-custom-preset.integration.test.ts` が通っていたのは直接モジュールを組み立てていたため。詳細は `configurable_phase_gate_b4_5_wiring_fix_plan.md`。

- [x] B-4.5-1: `PhaseDependenciesConfig` VO に `gates?: readonly unknown[]` 追加（optional + default `[]` で後方互換）
- [x] B-4.5-2: `load-resolved-config-use-case.ts` で `phaseDependencies.gates` raw forward
- [x] B-4.5-3: `PhaseConfigSectionMapper` を `config-foundation/application/mappers/` に新設（main.ts / hook adapter 共有）
- [x] B-4.5-4: `main.ts check-phase-gate` に `--target-file` 引数追加
- [x] B-4.5-5: `phase-gate-query-adapter` で `phaseConfig` 配線 + `ConfigValidationError` 判別で invalid config fail-fast（blocker 返却）

#### B-5. テスト（v0.24.0）

- [x] B-5-1: `GateGraph` DAG 検証のユニットテスト（循環検出、レベル順序違反、ダイヤモンド DAG 健全系）
- [x] B-5-2: `ResolveGateUseCase` のテスト — glob マッチ + requires チェック + dependsOn 解決（B-2〜B-4 で概ねカバー済）
- [x] B-5-3: `custom` プリセット E2E テスト — `custom-preset-cli.e2e.test.ts` 3 ケース（gates 満たす / @story-id 欠損 / schema 違反 level:99 fail-fast）。B-5 着手時に 7 番目の配線ギャップ（`main.ts:loadResolvedConfig` が `ConfigValidationError` を黙殺）を発見し、CLI 側 fail-fast 修正を併せて実施（hook 側 B-4.5 と対称）

#### B-6. ドキュメント（v0.25.0）

- [x] B-6-1: `docs/guide/configuration.md` に `gates[]` リファレンス追加（フィールド定義表 + 制約 + 3 パターン例）
- [x] B-6-2: カスタムゲート設定の例を 3 パターン提供（単一 level-3 ストーリーゲート / ダイヤモンド DAG 4 ゲート / 最小 level-1 スキーマガード）

#### B-7. ProtectedFileList 除外設定機能（2026-04-06 追加）

> C-3（tsc --noEmit エラー解消）着手時に発覚。`tsconfig.json` / `package.json` が `ProtectedFileList` の `DEFAULT_PATTERNS` にハードコードされており、quick-implementor スキル内でも pre-tool-use hook がブロックする。設定変更（`config` カテゴリ）を AI 側で完結させるため、`phasegate.config.json` から保護対象の除外を制御できる仕組みを追加する。

**現状の保護チェーン**:
```
.claude/settings.json (matcher: "Write|Edit")
  → pre-tool-use-hook.ts
    → AsyncHookToCliTranslator.translatePreToolUse()
      → ProtectedFileList.createWithAdditional(additionalPatterns)
        → DEFAULT_PATTERNS (ハードコード5件) + additionalPatterns (常に空配列)
```

**設計方針**: `phasegate.config.json` に `protectedFiles.exclude` キーを追加し、DEFAULT_PATTERNS からの除外を可能にする。

- [ ] B-7-1: `harness-config-v2.schema.json` に `protectedFiles` セクション追加（`exclude: string[]`）
- [ ] B-7-2: `ProtectedFileList` に除外リスト対応の factory メソッド追加（`createWithExclusions(additional, exclusions)`）
- [ ] B-7-3: `HarnessConfigConfigQueryAdapter` で `protectedFiles.exclude` を読み取り
- [ ] B-7-4: `AsyncHookToCliTranslator.translatePreToolUse()` で除外リストを `ProtectedFileList` に渡す
- [ ] B-7-5: `phasegate.config.json` に `protectedFiles.exclude: ["tsconfig.json", "package.json"]` を設定
- [ ] B-7-6: テスト追加（ProtectedFileList 除外動作 / adapter 読み取り / E2E で保護解除確認）

---

### Phase C: 既存技術的負債の解消（Phase B と独立レーン、優先度中）

> **2026-04-05 追加** — B-2 実装時の検証で発見した既存ベースライン問題。いずれも B-2 起因ではなく、v0.19.0 時点から存在する長期負債。Phase B の実装スコープ外だが、品質向上のため独立レーンで対処する必要がある。

#### C-1. Vitest ワーカー RPC タイムアウト解消（v0.27.0）

- [x] C-1-1: `npm run test` 実行時の `Timeout calling "onTaskUpdate"` エラーを解消
  - **症状**: 全 402 files / 3002 tests が PASS するにもかかわらず、Vitest 3.2.4 のワーカー RPC タイムアウトにより exit 1 になる
  - **根本原因**: `pool: 'forks'` + `fileParallelism: false` + 402 ファイル逐次実行で birpc の onTaskUpdate RPC がハードコード 60s 以内に完了しない
  - **検証した対処候補**:
    - (a) `poolOptions.forks.singleFork: true` → NG（402 中 1 ファイルしか実行されない）
    - (b) Vitest 3.3+ アップグレード → 適用不可（3.2.4 が最新安定版）
    - (c) `teardownTimeout` / reporter 軽量化 / 環境変数 → いずれも無効（birpc timeout はハードコード）
    - **(d) threads/forks ハイブリッド分割 → 採用**: threads pool（399 ファイル）+ forks pool（`process.chdir()` 依存 3 ファイル）
  - **結果**: 全 3002 テスト PASS + exit 0、実行時間 252s → 117s（2.2x 高速化）

#### C-2. phasegate lint ベースライン違反の解消

- [ ] C-2-1: `__tests__/fixtures/` 配下の L1-004（宣言レイヤーとディレクトリ構造の不一致）を整理
  - **症状**: `npx phasegate lint` で 1218 violations、大半が fixtures
  - **根本原因**: テスト用フィクスチャに `@layer` アノテーションが付与されているが、fixtures ディレクトリは検証対象外という想定が lint 側と乖離
  - **対処候補**:
    - (a) fixtures ディレクトリを lint の除外リストに追加
    - (b) fixtures 内ファイルの `@layer` アノテーションを削除 or `@layer fixture` のような特殊値を導入
    - (c) fixtures を `scripts/harness/__tests__/` 外に移動
  - **優先度**: 中（`phasegate lint` の本来のシグナルが大量のベースラインノイズに埋もれる）

- [ ] C-2-2: L1-004 以外の違反の集計と対処
  - 1218 件の内訳を分類し、fixtures 以外の本来対処すべき違反を特定

#### C-3. TypeScript `tsc --noEmit` エラーの解消

> **前提**: B-7（ProtectedFileList 除外設定）完了後に着手。`tsconfig.json` の AI 編集には B-7 による保護解除が必要。

- [ ] C-3-1: `tsconfig.json` に `allowImportingTsExtensions: true` + `noEmit: true` 設定、fixtures を exclude に追加（TS5097 × 151件 + fixtures × 4件 解消）
  - **症状**: `npx tsc --noEmit` で 212 errors
  - **根本原因**: `tsconfig.json` に `allowImportingTsExtensions: true` が未設定、`outDir` と `noEmit` の矛盾
  - **前提**: B-7 完了により `tsconfig.json` が AI 編集可能であること

- [ ] C-3-2: テスト mock 型不整合修正（約31件）
  - `.mock` プロパティ型エラー、mock オブジェクトの不足プロパティ、`readonly` 代入、暗黙 `any` 等
  - `__tests__/` 配下のため phase gate 対象外、直接修正可能

- [ ] C-3-3: プロダクションコード型エラー修正（約16件）
  - Ajv ESM import（`new Ajv()` 不可、namespace as type）× 4件
  - レガシー `../core/*.js` モジュール参照 × 9件
  - `unitName` → `unitNames` typo、`string | undefined` → `string` 等 × 3件
  - quick-implementor で修正

#### C-4. Phase C 実施順序

```
C-1（Vitest タイムアウト解消） ← 完了（v0.27.0）
  ↓
B-7（ProtectedFileList 除外設定）← C-3 の前提。tsconfig.json / package.json の AI 編集を可能にする
  ↓
C-3（tsc エラー解消）          ← 型検証の実効化（B-7 完了が前提）
  ↓
C-2（lint ベースライン解消）   ← lint シグナルの信頼性回復
```

C-1 完了済。B-7 は C-3 のブロッカーのため先行実施。C-2 と C-3 は独立だが、C-3 を先に実施する（型エラーの方が実害が大きい）。

---

### 実施順序の推奨

```
A-1（未決事項解決）
  ↓
A-2（ドメイン層）→ A-7-1, A-7-2（ドメインテスト）
  ↓
A-2.5（Bash 迂回対策）← A-3 着手前に必須
  ↓
A-3（アプリケーション層）→ A-7-3, A-7-4（アプリケーションテスト）
  ↓
A-4（インフラ層）→ A-7-5（インフラテスト）
  ↓
A-5（プレゼンテーション層）→ A-7-6, A-7-7（統合テスト）
  ↓
A-6（マイグレーション）→ A-6-3（既存テスト更新）
  ↓
A-8（ドキュメント）
```

各ステップは TDD（Red → Green → Refactor）で進行し、`story-implementor` スキルの 2 フェーズ実行に従う。

---

## 8. 未決事項

- [x] `{unit}` の解決 → **パスベース + `@unit` アノテーション併用。`@unit` は複数ユニット対応（カンマ区切り + 複数行）。§4.8 参照**
- [x] `blocks` の glob ライブラリ選定（minimatch / picomatch）→ **picomatch 採用**（B-4-2 で実装済み。既に transitive で v4.0.4 存在、高速、zero deps）
- [x] `standard` の Phase 3 で `scenario_test_design.md` の扱い → **storyReflection 対象外。テスト設計は US 単位で inception に管理され product に累積更新されないため。§4.2 参照**
- [x] `init` コマンドでプリセット選択 UI を提供するか → **v1.0 で `--preset` オプション追加。`npx phasegate init --name my-project --preset minimal`**
- [x] storyReflection のデフォルト mappings → **プリセットごとにハードコード。config 省略時はゼロコンフィグで動作**
- [x] issue (`ISSUE-XXX`) の storyReflection → **US と同一 mappings を適用。folder_management_rules.md の issue 処理フロー Step 4 が根拠**
- [x] Phase Gate でファイル内容検証まで対応するか → **不要**。スキル指示 + L2-002 で担保
- [x] cascade-updater 自動化 → storyReflection ゲートにより事実上必須化。自動実行は不要（手動で cascade-updater を使用）
