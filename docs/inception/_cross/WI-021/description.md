---
id: WI-021
type: issue
severity: normal
status: drafted
legacy_id: ISSUE-021
affects: [agent-integration（hook）/ quick-mode（judgment engine）]
---

# ISSUE-021: Full mode 判定が story-implementor コンテキストを認識せず、正規ルート経由でも Port/Adapter ファイルの変更が構造的に不可能

## ステータス

- **状態**: 🟢 **CLOSED (v0.81.0, 2026-04-23)** — 選択肢 A で解決。`PhaseGateQueryPort.checkDesignDocsExist` 追加 → `HandlePreToolUseUseCase` で bypass 判定。self-verify として ISSUE-018 の Port 移動を実施し block されないことを確認
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-018（Port 配置修正）着手時、quick-implementor でブロック → `/story-implementor` に誘導 → story-implementor 経由でも同一ブロックが再発する循環に遭遇
- **影響Unit**: agent-integration（hook）/ quick-mode（judgment engine）
- **深刻度**: **High** — phasegate の中核仕様に構造的ギャップ。他プロジェクトに導入した場合も同じ摩擦が発生する
- **優先度**: **P1** — ISSUE-018 以降の Port 関連 refactor は本 issue 解決待ち

## 問題の概要

`scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine.ts:29` で `*port.ts` / `*adapter.ts` 終端のファイルは一律 `api` カテゴリに分類される。`api` は `allowedCategories` 外のため、Write/Edit 時に必ず `MIXED_CHANGES` として full mode 要求され、block される。

block のエラーメッセージは `/story-implementor スキルを使用して設計フェーズから開始してください` と誘導するが、**story-implementor スキルを起動しても全く同じブロックが発生する**。これは pre-tool-use-hook の判定ロジックがスキルコンテキストを一切参照しない設計であるため。

### 構造的循環

```
[quick-implementor] → Port ファイル変更検出
  ↓ block with "use /story-implementor"
[/story-implementor 起動]
  ↓ Phase 2 で Port ファイル Write
[pre-tool-use-hook] → 同じ classifier で `api` 判定
  ↓ block with "use /story-implementor"  ← 循環
```

### 根本原因

`HandlePreToolUseUseCase.execute()`（`scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts:125-144`）:

```typescript
if (HandlePreToolUseUseCase.WRITE_TOOLS.has(input.toolName)
    && this.fullModeRequirementQueryPort !== undefined
    && input.targetFilePaths.length > 0) {
  if (grandfather.allGrandfathered) {
    this.grandfatherLogger('full-mode', input.targetFilePaths);
  } else {
    const fullModeResult = await this.fullModeRequirementQueryPort.check(input.targetFilePaths);
    if (fullModeResult.requiresFullMode) {
      // ここで必ずブロック。解除条件が grandfather しか無い
      return HandlePreToolUseUseCase.buildFullModeRequiredBlockOutput(...);
    }
  }
}
```

full mode 要求の解除条件が **grandfather しか無い**。以下が判定材料として存在しない:
- 現在起動中のスキル（`/story-implementor` 中か否か）
- 当該 Unit の設計文書（logical_design.md / domain_model.md 等）の存在
- 「既存ファイルの移動 or リネーム」と「新規 API 追加」の区別

### 影響

- **本リポジトリ**: ISSUE-018（Port 配置修正）が着手不能。今後の Port/Adapter リネーム・移動も同様に不可能
- **他プロジェクト**: phasegate を導入した任意のプロジェクトで、Port/Adapter の refactor（リネーム / レイヤー間移動 / ディレクトリ整理）が全て構造的にブロックされる。Clean Architecture 準拠のプロジェクトでは致命的な摩擦

## 設計意図の推測

おそらく本来の意図は以下:
- 新しい API 契約の追加（= Port/Adapter ファイルの新規作成）には上位設計文書が必要
- 設計文書がある状態で story-implementor 経由なら Write を許可

しかし現実装では「設計文書の存在チェック」が full mode 判定の解除条件として接続されておらず、全面 block になっている。

## 修正案

### A. 設計文書の存在を full mode 判定の解除条件に追加（推奨）

`HandlePreToolUseUseCase.execute()` の full mode ブランチで、以下の追加条件を導入:

```typescript
if (fullModeResult.requiresFullMode) {
  // 新規追加: 当該 Unit の必須設計文書が全て存在する場合、許可
  const designDocsComplete = await this.checkDesignDocsComplete(input.targetFilePaths);
  if (designDocsComplete) {
    return { shouldBlock: false };  // pass-through
  }

  return HandlePreToolUseUseCase.buildFullModeRequiredBlockOutput(...);
}
```

`checkDesignDocsComplete` は以下を検査:
- `docs/product/construction/{unit}/logical_design.md` 存在
- `docs/product/construction/{unit}/domain_model.md` 存在
- （Port/Adapter に対してはこれら 2 つで十分。Unit/IT test_design は推奨止め）

**メリット**:
- スキルコンテキスト依存が不要（hook は stateless のまま）
- 「設計が揃っている Unit は Port 移動 OK」が自然に表現される
- `/story-implementor` の意味と整合（設計文書があれば実装に進める）

**デメリット**:
- 設計文書が既に揃っている Unit では full mode ブロックが事実上無効化される
  → ただし本来 story-implementor を経由した実装はこの状態のはずなので妥当

### B. 環境変数によるスキルコンテキスト伝達

`/story-implementor` 起動時に `PHASEGATE_FULL_MODE_APPROVED=1` を export、hook 側で参照。

**メリット**: 簡単
**デメリット**: env var はプロセス間で受け渡しが曖昧。偽装容易で bypass の抜け穴になりやすい

### C. 新規 vs 既存の区別（classifier 改善）

`categorizeFile` で baseline.json と照合し、既に登録済みの Port/Adapter ファイルの MOVE/RENAME は `refactor` カテゴリ（allowedCategories に追加）として分類。

**メリット**: 「API 契約の新規追加」と「refactor」を意味的に分離できる
**デメリット**: 実装コスト大きく、baseline の semantics が広がる

## 推奨: 選択肢 A

最小の変更で構造的バグを解消できる。ロジックも直感的（「設計が揃っている Unit は block しない」）。

### Acceptance criteria

- [ ] `HandlePreToolUseUseCase` の full mode ブランチに design docs 存在チェックを追加
- [ ] 設計文書チェック用 Port (`DesignDocsQueryPort` 等) を新設し、infrastructure adapter で実装
- [ ] 当該 Unit の `logical_design.md` / `domain_model.md` が両方存在する場合、full mode block を pass-through
- [ ] 既存テスト 3299 件 green 維持
- [ ] **Self-verification**: ISSUE-018 の Port 移動が本 issue 完了後にブロックされず実行可能であること

## 実装フェーズ

| Phase | 内容 | 見積り |
|---|---|---|
| A | `DesignDocsQueryPort` 新設 + adapter 実装 | 1h |
| B | `HandlePreToolUseUseCase` 修正 + Unit test | 1.5h |
| C | IT test（handle-pre-tool-use-usecase.test.ts）更新 | 1h |
| D | lint / 全テスト確認 + ISSUE-018 self-verify | 0.5h |

**合計見積り**: ~4h

## 参照

- `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts:125-144`（full mode 判定ブランチ）
- `scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine.ts:25-68`（categorizeFile）
- `scripts/harness/agent-integration/infrastructure/adapters/quick-mode-full-mode-requirement-adapter.ts`
- 関連 issue:
  - **ISSUE-018**（Port 配置修正）— 本 issue のブロック対象、解決待ち
  - **ISSUE-014**（アーキテクチャスタイル config 化）— 選択肢 C の方向と合流可能
  - **ISSUE-015**（QuickModeJudgmentEngine comment-only diff 検出）— 同じ judgment engine への改善案件

## 補足: dogfooding 検証済み

本 issue 起票前に以下を確認:
- ローカルソース（`scripts/harness/`）は v0.80.0（最新 commit `454fb8f`）
- hook は `npx tsx scripts/harness/...` でローカルソースを直接実行
- `devDependencies.phasegate` は**存在しない**（本リポジトリは自己参照していない）
- → ブロックは**最新版 phasegate の現在の仕様**であり、バージョン不整合による bug ではない
