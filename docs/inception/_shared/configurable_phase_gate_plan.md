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

---

## 3. ゴール

`phaseDependencies.preset` を拡張し、チームの成熟度に応じた段階的ゲート導入を可能にする。

**設計原則:**
- ハードコードされたデフォルトはプリセットとして残す（後方互換）
- ゲート条件は「ファイルの存在」。内容品質はスキル指示 + L2-002 事後検証で担保
- Phase Gate / L2-002 / cascade-updater の 3 系統がプリセット単位で連動

---

## 4. Phase A: プリセット拡充（v1.0）

### 4.1 config 変更

```jsonc
{
  "phaseDependencies": {
    "preset": "standard",    // "full" | "standard" | "minimal" | "custom"
    "override": false,       // custom 時のみ true
    "customRules": []        // Phase B で gates[] に置換
  }
}
```

マイグレーション: `"default"` → `"full"` として扱う（後方互換）。

### 4.2 プリセット定義（Single Source of Truth）

#### `full`（現行 default と同等）

| Level | ゲートノード | 必須アーティファクト | L2-002 | cascade-updater |
|-------|-----------|-------------------|--------|-----------------|
| 1 | product-architect, story-writer, story-mapper, unit-designer | 全8ファイル required | — | — |
| 2 | domain-designer, logical-designer, it-test-designer, unit-test-designer, it-test-logic-designer, unit-test-logic-designer | 全12ファイル required | — | — |
| 3 | logical-designer, scenario-test-designer, scenario-test-logic-designer, implementation-readiness-checker, story-implementor | 全アーティファクト optional（依存チェーンで順序強制） | **必須** | **提案** |

#### `standard`

| Level | ゲートノード | 必須アーティファクト | L2-002 | cascade-updater |
|-------|-----------|-------------------|--------|-----------------|
| 1 | product-architect, story-writer | `product_overview.md`, `user_stories.md` のみ required | — | — |
| 2 | domain-designer, logical-designer | `domain_model.md`, `logical_design.md` のみ required | — | — |
| 3 | logical-designer のみ required、他 optional | US固有 `logical_design.md` required | **必須** | **提案** |

#### `minimal`

| Level | ゲートノード | 必須アーティファクト | L2-002 | cascade-updater |
|-------|-----------|-------------------|--------|-----------------|
| 1 | なし | — | — | — |
| 2 | logical-designer のみ | `logical_design.md` のみ required | — | — |
| 3 | なし | — | **無効** | **任意** |

> `minimal` で L2-002 を無効にする理由: Phase 3 ゲートなしの状態で `@story-id` だけ強制するのは矛盾。

### 4.3 US / issue ワークフローの扱い

Phase 3 ゲートは US (`inception/{unit}/{US-XXX}/`) と issue (`inception/{unit}/issues/{ISSUE-XXX}/`) の両方に適用される。`{storyId}` は US-XXX / ISSUE-XXX いずれのフォーマットでも解決可能。

- `full` / `standard`: US・issue 共にゲート発火
- `minimal`: Phase 3 ゲートなし → US・issue 共にゲートなし

### 4.4 Quick Mode × プリセット

| プリセット | Quick Mode (`relaxedGates: ["phase-gate"]`) 時の動作 |
|-----------|---------------------------------------------------|
| `full` | Phase 1-3 全ゲート緩和。L1 + L2(metadata, test-quality) は維持 |
| `standard` | 同上 |
| `minimal` | Phase 2 ゲートのみ緩和（Phase 3 は元々なし） |

Quick Mode の`maintainedLayers` は変更なし。Phase Gate 緩和はプリセットに関係なく `relaxedGates` で制御。

### 4.5 プリセット切替時の動作

- **厳格化**（minimal → standard）: 次回の Write/Edit から新プリセットのゲートが発火。既存ファイルは遡及検証しない（`phasegate validate` で手動検証可能）
- **緩和**（full → standard）: 即座に反映。不要になったゲートは無視される
- **制約**: `custom` へ切り替える場合は `override: true` が必須

### 4.6 実装方針

1. `default-phase-nodes.ts` → `full-phase-nodes.ts` にリネーム
2. `standard-phase-nodes.ts`, `minimal-phase-nodes.ts` を新設
3. `PhaseStructure.createDefault(policy)` がプリセットに応じたノードセットをロード
4. `PhaseCustomizationPolicy.preset` を `'full' | 'standard' | 'minimal' | 'custom'` に拡張（`'default'` は `'full'` にフォールバック）
5. `HarnessConfigPhaseConfigProvider.getCustomizationPolicy()` でマッピング

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
    ]
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

### 5.4 hook 連携

- pre-tool-use hook の対象パス判定を `blocks` glob パターンベースに変更
- `@unit` アノテーションからの unit 解決ロジックは維持
- `blocks` 未指定時は従来のデフォルト動作

---

## 6. マイルストーン

| Phase | バージョン | スコープ |
|-------|----------|---------|
| A | v1.0.0 | プリセット 4 種 + `"default"` → `"full"` マイグレーション |
| B | v1.1.0 | `gates[]` 完全実装 + JSON Schema 拡張 |

---

## 7. 未決事項

- [ ] `{unit}` の解決: `@unit` アノテーション以外のソース（ディレクトリ名ベース等）も必要か
- [ ] `blocks` の glob ライブラリ選定（minimatch / picomatch）
- [ ] `standard` の Phase 3 で `scenario_test_design.md` を推奨（警告）にするか必須にするか
- [ ] cascade-updater 自動化: v1.0 は提案のみ、v1.1 で自動実行を検討
- [ ] `init` コマンドでプリセット選択 UI を提供するか（`npx phasegate init --preset minimal`）
- [x] Phase Gate でファイル内容検証まで対応するか → **不要**。スキル指示 + L2-002 で担保
