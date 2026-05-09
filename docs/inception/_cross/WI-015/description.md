---
id: WI-015
type: issue
severity: normal
status: tested
legacy_id: ISSUE-015
affects: [quick-mode, agent-integration]
---

# ISSUE-015: QuickModeJudgmentEngine がコメントのみの差分も api 変更として分類してしまう

## ステータス

- **状態**: ✅ **TESTED**（WI-015 で `QuickModeJudgmentEngine` categorizer にコメントのみ差分判定を追加し、hook 経路から optional content を渡せるようにした）
- **優先度**: P3
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-003 Wave 2a（L1-007 no-comment-flood 解消）で、`scripts/harness/agent-integration/domain/ports/error-guidance-query-port.ts` のコメントブロック削減を PreToolUse hook がブロック。差分がコメント削除のみにもかかわらず `QuickModeJudgmentEngine` が `*port.ts` ファイルパスのみで `api` カテゴリ判定し FULL_MODE 要求した
- **影響Unit**: quick-mode（主）, agent-integration（hook 経路）
- **深刻度**: Low〜Medium — 実害は「既存 port/adapter のドキュメント整備が phase-gate で毎回ブロックされる」だけだが、lint 違反解消タスクの障害として恒常化しやすい
- **優先度**: P3 — ISSUE-003 残余 1 件の L1-007 解消をブロックしているが、他タスクへの波及は限定的。classifier の粒度改善としては独立したエンハンス

## 問題の概要

`QuickModeJudgmentEngine.categorizeFile`（`scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine.ts:25-68`）はファイルパスのみで `api / domain / test / docs / config / feature / bugfix` を分類する。`*port.ts` / `*adapter.ts` は無条件で `api` カテゴリになるため、差分の中身が interface シグネチャ変更でもコメント削除でも同じ扱い。

`phasegate.config.json` の `quickMode.fullModeRequiredWhen.apiContractChange: true` 設定下では、**コメント 1 行削除も port interface の型変更と同じ審査を要求**する。

### 現状（直接確認済み）

**`quick-mode-judgment-engine.ts:28-31`**:
```typescript
// api: *port.ts or *adapter.ts（最高優先度）
if (filePath.endsWith('port.ts') || filePath.endsWith('adapter.ts')) {
  return ChangeCategory.fromString('api');
}
```

**`quick-mode-judgment-engine.ts:137-150`**:
```typescript
// 3. API_CONTRACT評価: *port.ts / *adapter.ts の変更
if (config.isFullModeRequiredFor('apiContractChange')) {
  const apiContractFiles = changedFiles.filter(
    (f) => f.filePath.endsWith('port.ts') || f.filePath.endsWith('adapter.ts'),
  );
  if (apiContractFiles.length > 0) {
    return QuickModeEligibility.rejected('API_CONTRACT', apiContractFiles, ...);
  }
}
```

判定は **path のみ**を見ており、`ChangedFile` には diff 情報が載っていない。

### 再現手順（ISSUE-003 Wave 2a で実発生）

1. `error-guidance-query-port.ts` のファイル先頭 JSDoc 説明文（interface シグネチャに影響しないコメントのみ）を削除しようと Edit を試行
2. PreToolUse hook が `API_CONTRACT` reason でブロック（`metadata.reason = 'FULL_MODE_REQUIRED'`, カテゴリ `api`）
3. 実際の diff は `-/** ... */` 行の削除だけで、`export interface ErrorGuidance { ... }` は一切変わらない

### 影響シナリオ

| シナリオ | 影響 |
|---|---|
| port/adapter のコメント簡素化（L1-007 解消） | 毎回ブロック、story-implementor 相当の design 再審査が必要になる |
| port/adapter の `@unit` / `@layer` メタデータ修正（L1-001/L1-002 解消） | 同上 |
| port/adapter のドキュメント追加・typo 修正 | 同上 |
| port/adapter の本当の interface 変更 | 期待通り正しくブロックされる（これは維持したい） |

## 修正案: classifier に diff 解析を追加

### 構造

現状:
```
ChangedFile { filePath, changeKind }
    └→ categorizeFile(path のみ) → ChangeCategory
```

改修後:
```
ChangedFile { filePath, changeKind, beforeContent?, afterContent? }
    └→ categorizeFile(path + diff) → ChangeCategory
        └→ diff がコメント/空白のみなら 'docs' に降格
```

### 実装方針

**A. `ChangedFile` の拡張**
- `scripts/harness/quick-mode/domain/value-objects/changed-file.ts` に `beforeContent?: string | null` / `afterContent?: string | null` を optional で追加（undefined なら従来動作）

**B. PreToolUse hook の diff 提供**
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` が Write/Edit の before/after を取得して `ChangedFile` に詰める
- Edit ツールの場合: old_string/new_string がそのまま diff
- Write ツールの場合: ディスク上の既存内容 vs 新規内容
- Bash (tee/cp/mv/touch 等) の場合: best-effort（取れなければ従来通り path 判定のみ）

**C. `isCommentOnlyDiff` ヘルパー**
- `scripts/harness/quick-mode/domain/services/comment-only-diff-detector.ts`（新規）
- JS/TS のコメント正規表現（`//`, `/* */`）と空白のみを剥がして同一性を比較
- 厳密 AST ベースでなくても概ね OK（tokenization レベルでの類似判定で十分）
- edge case: 文字列リテラル内の `//` / `/*` を誤検出しない程度の処理

**D. classifier ロジック**
- `categorizeFile(file)` 冒頭で `isCommentOnlyDiff(file)` を評価
- true なら `docs` に即座に分類（`*port.ts` / `*adapter.ts` より優先）

### Acceptance criteria

- [x] `*port.ts` のコメント削除のみの編集が hook 経路で FULL_MODE_REQUIRED を発火しない
- [x] `*port.ts` の interface 型追加・signature 変更は quick-mode 判定で従来通り `API_CONTRACT` 扱い
- [x] 既存テスト（quick-mode unit / agent-integration integration）green
- [x] 新規テスト: `isCommentOnlyDiff` の単独検証、hook 経路の content 伝播検証
- [x] `phasegate.config.json` スキーマは変更不要（classifier の内部挙動改善に留める）

### 完了証跡（2026-05-09）

- `pnpm exec vitest run scripts/harness/__tests__/unit/quick-mode/domain/services/comment-only-diff-detector.test.ts scripts/harness/__tests__/unit/quick-mode/domain/value-objects/changed-file.test.ts scripts/harness/__tests__/unit/quick-mode/domain/services/quick-mode-judgment-engine.test.ts scripts/harness/__tests__/unit/quick-mode/application/usecases/classify-change-category-usecase.test.ts` — 4 files / 52 tests passed
- `pnpm exec vitest run scripts/harness/__tests__/integration/agent-integration/quick-mode-full-mode-requirement-adapter.test.ts scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts` — 2 files / 56 tests passed
- `pnpm exec vitest run scripts/harness/__tests__/unit/quick-mode scripts/harness/__tests__/integration/quick-mode` — 24 files / 250 tests passed
- `pnpm exec vitest run scripts/harness/__tests__/integration/agent-integration/quick-mode-full-mode-requirement-adapter.test.ts scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts scripts/harness/__tests__/integration/agent-integration/codex-payload-compatibility.integration.test.ts` — 3 files / 62 tests passed
- `pnpm exec tsc --noEmit` — passed
- `pnpm harness:check-ready` — passed
- `git diff --check` — passed
- Dogfood: PreToolUse hook に `Edit` payload を流し、コメントのみ API path 変更が `FULL_MODE_REQUIRED` ではなく既存の `L2-STORY-REFLECTION` 未反映で停止することを確認

### 実装フェーズ

| Phase | 内容 | 見積り |
|---|---|---|
| A | `ChangedFile` VO 拡張 + unit test | 0.5d |
| B | `isCommentOnlyDiff` サービス + unit test | 0.5d |
| C | hook 経路で before/after を詰め込む + IT test | 1d |
| D | classifier への統合 + 既存テスト調整 | 0.5d |
| E | dogfood: `error-guidance-query-port.ts` のコメント削除を通す検証 | 0.5h |

**合計見積り**: ~2.5d

### スコープ外

- classifier を phasegate.config で外部カスタマイズ可能にする（ISSUE-014 が別途扱う）
- `*port.ts` 以外のファイル命名規則変更

## ISSUE-003 Wave 2a 残余 1 件との関係

ISSUE-003 Wave 2a（L1-007 解消）で 48 件中 47 件を処理した結果、`error-guidance-query-port.ts` 1 件が phase-gate で残った。この 1 件は本 issue の解決で自動的に解消される（comment-only diff → `docs` 分類 → phase-gate スルー）。

**暫定対応**: Wave 2a は「47/48 + 1 件 deferred to ISSUE-015」として完了。`phasegate lint` の L1-007 残数 1 件は本 issue 解決時に 0 化。

## 参照

- classifier 本体: `scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine.ts`
- ChangedFile VO: `scripts/harness/quick-mode/domain/value-objects/changed-file.ts`
- hook 経路: `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts`
- phasegate.config.json `quickMode.fullModeRequiredWhen.apiContractChange`
- 関連 issue: ISSUE-003（lint 違反解消）, ISSUE-014（アーキ style 外部化）
