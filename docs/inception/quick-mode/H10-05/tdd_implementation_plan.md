# TDD実装計画: H10-05 (quick-mode)

> **対応 Issue**: ISSUE-006 Story A
> **作成日**: 2026-04-21
> **前提 Unit 設計**: `docs/product/construction/quick-mode/logical_design.md` / `domain_model.md`

## 1. スコープ

### 対象ストーリー
H10-05 quick-mode の **config 駆動化 + classify CLI** — ISSUE-006 P2-1a / P2-2 を実装する。

### 含む
- `phasegate.config.json.quickMode.fullModeRequiredWhen` スキーマ新設（3 boolean flags）
- `QuickModeConfig` 値オブジェクトに `fullModeRequiredWhen` フィールド追加
- `QuickModeJudgmentEngine.judge()` のハードコード 3 rejection rule を config 駆動化（後方互換: デフォルト全 true）
- `HarnessConfigQuickModeConfigAdapter` を新フィールド読み込み対応
- 新 UseCase `ClassifyChangeCategoryUseCase`（分類のみを返す）
- 新 CLI `phasegate check-change-category --paths <csv> [--json]`
- 新 Handler `CheckChangeCategoryHandler`（presentation）

### 含まない（後続ストーリー / Issue で扱う）
- pre-tool-use hook 統合（ISSUE-006 Story B / agent-integration Unit 側で別ストーリー化）
- skill 本文の機械ブロック条件追記（ドキュメント作業・Story B と合流）
- フェーズゲート全体の再設計

### 影響する層
- Domain: `quick-mode-config.ts`, `quick-mode-judgment-engine.ts`（拡張）
- Application: `classify-change-category-usecase.ts`（新規）+ DTO（新規）
- Infrastructure: `harness-config-quick-mode-config-adapter.ts`（拡張）
- Presentation: `check-change-category-handler.ts`（新規）+ formatter（新規 or 既存再利用）
- CLI: `scripts/harness/main.ts`（新 case 追加）
- Config: `phasegate.config.json`（サンプル値追加）

---

## 2. 前提条件検証

- ✅ `docs/product/construction/quick-mode/logical_design.md` 存在
- ✅ `docs/product/construction/quick-mode/domain_model.md` 存在
- ✅ `docs/product/construction/quick-mode/unit_test_design.md` 存在
- ✅ `docs/product/construction/quick-mode/it_test_design.md` 存在
- ✅ `docs/product/construction/quick-mode/coverage_report.md` 存在
- ✅ 既存 H10-01 の UseCase / Engine / Adapter が稼働中で、本ストーリーはその拡張

**判定**: 既存 Unit 設計で十分 — 追加設計文書は生成せず TDD に進む

---

## 3. 設計変更の要点

### 3.1 `fullModeRequiredWhen` スキーマ

```json
{
  "quickMode": {
    "allowedCategories": ["bugfix", "docs", "test", "config"],
    "maintainedLayers": ["L1", "L2"],
    "relaxedGates": ["phase-gate", "2-phase-execution"],
    "fullModeRequiredWhen": {
      "mixedCategories": true,
      "newDomainFile": true,
      "apiContractChange": true
    }
  }
}
```

- **`mixedCategories`** → 既存 `MIXED_CHANGES` rule（allowedCategories 外検出）を有効化
- **`newDomainFile`** → 既存 `NEW_DOMAIN` rule（domain/ 配下 CREATE）を有効化
- **`apiContractChange`** → 既存 `API_CONTRACT` rule（*port.ts / *adapter.ts 変更）を有効化

**デフォルト値**（unset 時 / 旧 config 互換）: 全 true（= 現行ハードコード挙動を維持）

### 3.2 `QuickModeConfig` 拡張

```typescript
export interface FullModeRequiredRules {
  readonly mixedCategories: boolean;
  readonly newDomainFile: boolean;
  readonly apiContractChange: boolean;
}

export class QuickModeConfig {
  readonly fullModeRequiredWhen: FullModeRequiredRules; // 新規
  // ... 既存フィールド
  isFullModeRequiredFor(rule: 'mixedCategories' | 'newDomainFile' | 'apiContractChange'): boolean;
}
```

### 3.3 `JudgmentEngine` の config 駆動化

`judge()` 内の 3 rule 評価を `config.isFullModeRequiredFor(...)` でガード。false の rule はスキップ（eligible として扱う）。

### 3.4 `ClassifyChangeCategoryUseCase`（新規）

入出力:
```typescript
// Input
{ paths: readonly string[] }

// Output (DTO)
{
  dominantCategory: string | null,
  perFile: Array<{ path: string, category: string }>,
  fullModeRequired: boolean,
  rejectionRule: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT' | null,
  rejectionReason: string | null
}
```

内部実装は既存 `JudgeQuickModeEligibilityUseCase` を呼び出し、結果を classification-centric DTO に詰め替えるだけの薄いラッパー。changeKind は推定（パス存在チェックで CREATE / MODIFY を判定、または簡略化して全て MODIFY 固定）。

**簡略化方針**: 初版は全 paths を `changeKind: 'MODIFY'` として扱う（既存 `ci-check --quick --files` と同等）。CREATE 判定は git 連携が必要で hook 統合と一緒に Story B で扱う。

### 3.5 `check-change-category` CLI

```bash
# 基本
phasegate check-change-category --paths src/foo.ts,src/bar/port.ts

# JSON 出力
phasegate check-change-category --paths src/foo.ts --json

# 終了コード
# 0: Quick 適格
# 1: Full 必須（--fail-on-full-required フラグ時のみ。デフォルトは常に 0）
```

---

## 4. TDD 実装順序

### 4.1 Domain 層

| 順序 | 対象 | テスト内容 | 実装内容 |
|------|------|----------|---------|
| D-1 | `QuickModeConfig` | `fullModeRequiredWhen` 欠落時のデフォルト値（全 true）/ 明示指定時の保持 / `isFullModeRequiredFor()` の正当性 | フィールド追加・`create()` 拡張・`isFullModeRequiredFor()` 追加 |
| D-2 | `QuickModeJudgmentEngine` | `mixedCategories: false` で MIXED_CHANGES rule が無効化される / 他 2 rule も同様 / 全 true 時は現行挙動維持（regression） | `judge()` 内の 3 rule 評価を config ガード化 |

**実行方式**: メインセッションで直接実行

### 4.2 Application 層

| 順序 | 対象 | テスト内容 | 実装内容 |
|------|------|----------|---------|
| A-1 | `ClassifyChangeCategoryUseCase` | 空 paths → dominantCategory=null / 単一 bugfix → fullModeRequired=false / domain/ 新規 → NEW_DOMAIN / port.ts → API_CONTRACT | 新 UseCase + DTO |

**実行方式**: メインセッションで直接実行

### 4.3 Infrastructure 層

| 順序 | 対象 | テスト内容 | 実装内容 |
|------|------|----------|---------|
| I-1 | `HarnessConfigQuickModeConfigAdapter` | `fullModeRequiredWhen` 未定義時はデフォルト（全 true） / 明示定義時は値を保持 / 部分定義時は未指定フィールドのみデフォルト補完 | adapter 拡張 |

**実行方式**: メインセッションで直接実行

### 4.4 Presentation 層

| 順序 | 対象 | テスト内容 | 実装内容 |
|------|------|----------|---------|
| P-1 | `CheckChangeCategoryHandler` | `--paths` 解析 / human/json フォーマット / 終了コード | Handler + formatter |
| P-2 | `main.ts` | `check-change-category` case | dispatch 追加 |

**実行方式**: メインセッションで直接実行

### 4.5 Integration / E2E

| 順序 | 対象 | テスト内容 |
|------|------|----------|
| E-1 | CLI E2E | 実コマンド `npx phasegate check-change-category --paths ...` で期待出力・exit code を確認 |
| E-2 | Regression | `npx phasegate ci-check --quick --files ...` の既存挙動に変化が無いこと |

---

## 5. 環境検証チェックリスト

- [ ] `npm run build` 成功
- [ ] `npm test` 既存テスト全通過（quick-mode 既存ユニット/IT）
- [ ] `npx phasegate lint` 成功（L1 メタデータ）
- [ ] 新ファイル全てに `@unit quick-mode` + `@layer` + 必要なら `@story H10-05` 付与
- [ ] `npx phasegate ci-check --quick --files scripts/harness/quick-mode/application/usecases/classify-change-category-usecase.ts` が回帰せず機能する

---

## 6. QA（不明点・確認事項）

### [Question] Q1: `fullModeRequiredWhen` のデフォルト値戦略

現行ハードコード挙動を壊さないため、未定義フィールドのデフォルトは **全 true**（= 全ルール有効）とする方針。これにより既存プロジェクトの `phasegate.config.json` を変更せずに本機能が有効になる。

**推奨案**: 全 true デフォルト（後方互換優先）

[Answer]
推奨案で承認（2026-04-21）。

---

### [Question] Q2: `ClassifyChangeCategoryUseCase` の changeKind 取り扱い

pre-tool-use hook 統合（Story B）では git 変更状態を見ないとCREATE/MODIFY の判別ができない。本ストーリー（Story A）では CLI 入力の paths を単純化のため全て `MODIFY` として扱い、`NEW_DOMAIN` rule（CREATE 検出）は暫定的に適用されない。

**推奨案**: 初版は MODIFY 固定。git 連携は Story B で `ChangedFilesPort` 経由で実装。`--change-kind create|modify` フラグを CLI に追加するオプションも別途検討可能だが、まずは最小実装で出す。

[Answer]
推奨案で承認（2026-04-21）。git 連携は Story B に持ち越し。

---

### [Question] Q3: phasegate.config.json 実サンプルへの追加

本プロジェクト（PhaseGate 自体）の `phasegate.config.json` に `fullModeRequiredWhen` ブロックを追加するかどうか。後方互換が取れているので追加不要だが、dog-fooding として明示記述する意義もある。

**推奨案**: 追加する（デフォルト値を明示するとドキュメント価値が高い）

[Answer]
推奨案で承認（2026-04-21）。実サンプルに明示追加。

---

### [Question] Q4: CLI exit code の扱い

`check-change-category` の exit code をデフォルト 0 固定（pure inspection tool）にするか、デフォルトで Full 必須時に 1 を返すか。

**推奨案**: デフォルト 0（情報取得ツール）、`--fail-on-full-required` オプトインで 1 を返す。これにより CI / hook 側で使いやすさが向上し、誤ったブロックも防げる。

[Answer]
推奨案で承認（2026-04-21）。

---

## 7. リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| 既存 `QuickModeJudgmentEngine.judge()` を書き換えるため他所（`ci-check --quick`）で回帰 | 中 | 既存 IT テスト全通過を必須条件にする。config デフォルトを全 true に固定し、`quickMode.fullModeRequiredWhen` 未設定の config は完全に現行挙動を維持 |
| `phasegate.config.json` スキーマが v0 → v1 破壊的変更になると他PJに影響 | 中 | optional フィールドとして追加のみ。既存フィールドには触らない |
| CLI 追加で main.ts が肥大化 | 小 | 既存 `ci-check` と同じパターンに従う。Composition Root から handler を取得する形式を維持 |

---

## 8. 完了条件

- [ ] Domain / Application / Infrastructure / Presentation 各層のユニット/IT テスト追加済みかつ全通過
- [ ] `npx phasegate check-change-category --paths ...` が動作
- [ ] 既存 `npx phasegate ci-check --quick --files ...` に回帰なし
- [ ] `phasegate.config.json` サンプル更新（Q3 の回答次第）
- [ ] `docs/inception/issues/ISSUE-006/issue_description.md` の受け入れ基準 P2-1a / P2-2 / P2-3 に [x]

## 9. 次ストーリー（依存）

**H11-XX（agent-integration）**: pre-tool-use hook が `quick-implementor` スキル活性時に `ClassifyChangeCategoryUseCase` を呼び、`fullModeRequired === true` ならブロック / 警告する（ISSUE-006 P2-1b）。本ストーリー完了後に着手。
