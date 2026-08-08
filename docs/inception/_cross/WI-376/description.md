---
id: WI-376
type: refactor
severity: medium
status: tested
affects: [agent-integration]
source: GitHub issue #44 課題 1（skill-context 伝播 channel）/ ADR-039
---

# WI-376: pre-tool-use hook から skill 名の受け口を削除する

<!-- @work-item-id WI-376 -->

## 背景

ADR-039 の決定に従い、producer が存在しない自己申告 identity の受け口を削除する。

削除対象（実測した参照箇所）:

| 箇所 | 内容 |
|------|------|
| `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` | `PreToolUseHookInput.caller_skill` フィールド定義、`input.caller_skill ?? process.env.PHASEGATE_CALLER_SKILL` の読み取り、use case への `callerSkill` 引き渡し |
| `scripts/harness/agent-integration/application/dto/handle-pre-tool-use-dto.ts` | `HandlePreToolUseInput.callerSkill` |
| `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts` | `buildFullModeRequiredBlockOutput` の `callerSkill` 引数、`shouldGuideQuickModeRelax` の `callerSkill === "quick-implementor"` フォールバック |
| `scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-config-plan-guidance.test.ts` | `callerSkill: "quick-implementor"` を注入するだけで成立していたテスト（偽の被覆） |
| `docs/product/construction/agent-integration/logical_design.md` | caller skill context を optional 入力として記述している段落 |

## 修正

1. 上記の受け口・分岐・引数をすべて削除する。`shouldGuideQuickModeRelax` は `dominantCategory` のみを引数に取る。
2. カテゴリ未確定時は `/story-implementor` 案内（WI-354 の非 quick スコープ時と同じ挙動）に一本化する。
3. mock 注入テストは削除し、**WI-354 の category ベース分岐が不変であること**を回帰テストで固定する。
   - quick スコープ 4 カテゴリ（`bugfix` / `docs` / `test` / `config`）→ quick-mode-relax guidance
   - 非 quick スコープ 3 カテゴリ（`feature` / `domain` / `api`）→ `/story-implementor` guidance
   - カテゴリ未確定 → `/story-implementor` guidance
   - `phasegate.config.json` の config カテゴリブロック → config:plan 復旧手順（先行分岐）
4. `HandlePreToolUseInput` に `callerSkill` を渡す呼び出し元は hook のみであり、外部 API 契約（CLI 引数・hook payload 仕様）には現れないため、利用者影響は無い。

## 挙動不変の検証

`callerSkill` が実運用で常に `undefined` である以上、削除前後で hook の出力は同一でなければならない。上記 4 系統の回帰テストが削除前の実装でも削除後の実装でも同じ期待値で緑になることをもって不変を確認する。
