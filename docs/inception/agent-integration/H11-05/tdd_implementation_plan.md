---
story_id: H11-05
unit: agent-integration
related_issue: ISSUE-006
version_target: v0.64.0
created: 2026-04-21
---

# TDD実装計画: H11-05 — PreToolUse Hook に Full mode 必須検出を統合

## 1. スコープ

**受け入れ基準** (ISSUE-006 P2-1b):
- pre-tool-use hook が `quick-implementor` 起動時に Full 必須条件を検出してブロック / 警告する

**本ストーリーの最終成果**:
- `HandlePreToolUseUseCase` が Write/Edit 系ツール呼び出し時、対象ファイルを分類し `fullModeRequired` が真なら**警告メッセージをブロック出力**して Claude に Full mode への切替を促す
- `phasegate.config.json.quickMode.fullModeRequiredWhen` の各フラグ（Story A 実装済）が判定をゲートする
- agent-integration Unit の Clean Architecture 境界を保ち、quick-mode への依存は新規ポート + 新規アダプタ経由

**対象レイヤー**:
| 層 | 対象 |
|---|---|
| domain | `ports/full-mode-requirement-query-port.ts` (新規) |
| application | `handle-pre-tool-use-usecase.ts` 拡張（任意依存として注入） |
| infrastructure | `adapters/quick-mode-full-mode-requirement-adapter.ts` (新規) |
| presentation | `pre-tool-use-hook.ts` にアダプタ配線追加 |

**スコープ外**:
- `quick-implementor` スキル説明文への「機械的ブロック条件」追記（ISSUE-006 修正案 3）→ 別作業
- 他PJ FB 提供者への再レビュー依頼（ISSUE-006 acceptance の最終項目）→ 別作業
- git diff ベースの new/modify 判別 → Story A で明示的に deferred のまま、本 story でも扱わない

## 2. 前提条件検証

| チェック項目 | 結果 |
|---|---|
| `docs/product/construction/agent-integration/logical_design.md` | ✅ 存在 |
| `docs/product/construction/agent-integration/domain_model.md` | ✅ 存在 |
| `docs/product/construction/agent-integration/unit_test_design.md` | ✅ 存在 |
| `docs/product/construction/agent-integration/it_test_design.md` | ✅ 存在 |
| `docs/product/environment_contract.md` | ✅ 存在 |
| quick-mode の `ClassifyChangeCategoryUseCase` (v0.63.0) | ✅ 実装済 |
| Story-specific logical_design.md | ⚠️ 未作成（本 story は pre-existing Unit の minor 拡張のため TDD 計画のみで進める。前 Story H10-05 と同じ運用） |

## 3. 設計方針

### 3.1 クロスユニット依存の扱い

agent-integration Unit は現在 quick-mode に直接依存していない。本 story で依存を追加するが、以下で Clean Architecture を維持する:

- **domain 層**: `FullModeRequirementQueryPort` を定義（quick-mode を import しない）
- **infrastructure 層**: `QuickModeFullModeRequirementAdapter` が `createQuickModeCompositionRoot()` を呼び出し、`ClassifyChangeCategoryUseCase` の結果を port の戻り値に変換
- **application 層**: `HandlePreToolUseUseCase` は port の型にのみ依存し、任意依存（port 未注入なら無効）
- **presentation 層**: `pre-tool-use-hook.ts` がアダプタをインスタンス化して usecase に DI

### 3.2 判定タイミングと出力

`HandlePreToolUseUseCase.execute()` の実行順序:

```
1. PhaseGate block → 検出すれば即 return（既存）
2. ProtectedFile block → 検出すれば即 return（既存）
3. ★ 新規: FullModeRequirement check → 検出すれば block 出力
4. StoryReflection check（既存）
```

出力仕様:
- `blockReason: 'FULL_MODE_REQUIRED'`（新 enum 値）
- `shouldBlock: true` — **warn ではなく block として出力**（Q1 推奨案参照）
- `error.message`:
  ```
  Full mode 必須変更が検出されました: <path>
  カテゴリ: <api|domain|feature>
  理由: <rejectionReason>
  次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
  ```

### 3.3 無効化ルート

全フラグ false のケースでは port 経由で `requiresFullMode: false` が返るため、本 story で追加のゲーティングは不要。既存 Story A の config-driven 機構を再利用する。

## 4. TDD実装順序

### Phase 2-A: Domain 層 (RED → GREEN → REFACTOR)
| 対象 | テスト内容 |
|---|---|
| `full-mode-requirement-query-port.ts`（新規 interface） | 型契約の確認（compile-time） |
| `HookTranslationResult` / `BlockMetadata` に `FULL_MODE_REQUIRED` enum 追加 | 既存型の拡張ユニットテスト |

### Phase 2-B: Application 層 (RED → GREEN → REFACTOR)
| 対象 | テスト内容 |
|---|---|
| `HandlePreToolUseUseCase` 拡張 | (a) port 未注入 → 既存挙動維持 / (b) 注入済み + requiresFullMode=true → FULL_MODE_REQUIRED block / (c) 注入済み + false → skip / (d) Phase Gate / ProtectedFile ブロックが優先される順序 |

### Phase 2-C: Infrastructure 層 (RED → GREEN → REFACTOR)
| 対象 | テスト内容 |
|---|---|
| `QuickModeFullModeRequirementAdapter` | (a) domain path 注入 → requiresFullMode=true + rejectionRule=NEW_DOMAIN / (b) bugfix path → false / (c) quick-mode config 読み込み失敗 → graceful degradation（requiresFullMode=false） |

### Phase 2-D: Presentation 層配線
- `pre-tool-use-hook.ts` にアダプタ生成と DI を追加
- CLI E2E 確認: domain/api path を含む `tool_input` で stderr に `FULL_MODE_REQUIRED` メッセージが出ることを `echo '...' | node pre-tool-use-hook.js` で確認

## 5. QA（不明点・確認事項）

### [Question] Q1: block として出すか warn として出すか?

**背景**: ISSUE-006 の表現は「ブロック / 警告」で両方許容されているが、実装上は:
- **block** (exit 2): Claude Code の PreToolUse Hook でツール呼び出しを拒否。Claude が代替手段（story-implementor 起動）を探す強制力がある。
- **warn** (exit 0 + stderr): ツール呼び出しは通る。Claude は警告を見ても無視できる。

**推奨案**: **block (exit 2)** で出力する。理由:
- Phase Gate block と UI 一貫性が取れる
- Full mode 必須分類は「api / domain」という重い変更のみで発火するため、擬陽性コストが高くない
- 「自己正当化で Quick に流れる経路を塞ぐ」という ISSUE-006 の原意に最も合致

[Answer]
（推奨案で / warn に変更 / 独自案 — いずれか記入）

---

### [Question] Q2: skill 判定なしで全 Write/Edit に適用して良いか?

**背景**: ISSUE-006 原文は「quick-implementor 起動時に」と書かれているが、Claude Code の PreToolUse Hook には skill コンテキスト情報が渡されない。

**推奨案**: **全 Write/Edit に適用する**。理由:
- skill 判定は技術的に不可能（hook の stdin に skill 情報が含まれない）
- story-implementor が起動している場合でも、対象が feature パスなら既に Phase Gate が制御しているため重複ブロックにはならない（Phase Gate が先に発火）
- 「user が手動で Edit を直接叩いたケース」こそが ISSUE-006 の本質的ターゲット

[Answer]
（推奨案で / 別案 — いずれか記入）

---

### [Question] Q3: quick-mode config が未設定/壊れているときの挙動は?

**背景**: `phasegate.config.json` に `quickMode.fullModeRequiredWhen` が存在しない / パース失敗 / quick-mode composition-root 初期化エラー の場合。

**推奨案**: **graceful degradation = `requiresFullMode: false` を返してゲートを素通り**。理由:
- hook は quality defense の補助機能であり、設定エラーで全 Write を止めるのは過剰
- config エラー自体は別の validator が検出する（責務分離）
- adapter 内部で try/catch し、失敗時は silent に `false` を返す

[Answer]
（推奨案で / 別案 — いずれか記入）

---

### [Question] Q4: rejectionRule が `MIXED_CHANGES` のときも block するか?

**背景**: 単一 Write/Edit の tool call では対象 path が 1 件のみのため、mixed_categories は実質的に発火しない。しかし Bash 経由の複数ファイル書き込み（v0.57.0 で対応済）では複数 path が渡る。

**推奨案**: **`rejectionRule` の値に関わらず `requiresFullMode: true` なら block**。理由:
- Bash で domain + config を同時更新するパターンは ISSUE-006 の想定事案（「混ざった変更」）
- 判定ロジックは quick-mode 側に閉じ込める — agent-integration は真偽値のみで判断

[Answer]
（推奨案で / 別案 — いずれか記入）

---

## 6. 環境検証チェックリスト（事前実行結果）

- [x] 既存 pre-tool-use hook のテストが全 pass（v0.63.0 時点 3178/3178）
- [x] quick-mode composition-root は agent-integration と独立でビルド可能
- [x] `ClassifyChangeCategoryUseCase` は MODIFY 前提で動作（Story A Q2）

## 7. リスク

| リスク | 対応 |
|---|---|
| quick-mode 側のインターフェース変更が agent-integration を壊す | port を介在させることで契約を固定 |
| adapter が quick-mode 初期化に時間がかかり hook が遅延 | adapter はオンデマンド生成、エラー時 fallback |
| 擬陽性で合理的な bugfix が block される | Story A の分類ロジックが "api"/"domain"/"feature" 以外を通す設計で軽減。実運用で発火頻度が高すぎた場合は Q1 を warn 化する再評価 |

## 8. Phase 2 着手条件

- ユーザーが本計画を承認し、4 QA に回答を記入すること
- ISSUE-006 の受け入れ基準 P2-1b の文言に相違がある場合、事前に issue 側を更新
