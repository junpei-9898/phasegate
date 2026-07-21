---
id: WI-336
type: fix
severity: high
status: drafted
affects: [ci-governance]
source: bug sweep v0.292.0 (2026-07-21) Bug#1 + Bug#8
---

# WI-336: ci-governance composition-root の DI 注入漏れ 2 件と check-repetition exit code 逆転の修正

<!-- @work-item-id WI-336 -->

## 背景

composition-root.ts の Handlers 節で optional 依存の注入漏れが 2 件併発していた:

1. `MigrateAgentsMdHandler` に `ValidatePointersUseCase` が未注入(同ファイル内で生成済みなのに未使用)。handler 側の `if (validateOnly && this.validateUseCase)` が false になり、**`ci:migrate-agents-md --validate-only` が実マイグレーションへフォールスルーして AGENTS.md を実書き込みする**(検証専用フラグによる repo mutation)。
2. `CheckRepetitionHandler` に `ResetRepetitionUseCase` が未注入で、`ci:check-repetition --reset` が黙って no-op。

さらに check-repetition-handler.ts の exit code が逆転(記録なし=1/記録あり=0)しており、`--code` 未指定も未処理だった。

## 修正

1. composition-root で両 handler に不足依存を注入。
2. 配線 regression テストを composition-root 経由で追加(handler 単体への手動注入テストでは配線漏れを検出できないため)。
3. exit code を正しい向き(記録なし=0/繰り返し検出=1)に修正し、`--code` 欠落は usage エラー化。
