---
id: WI-250
type: story
severity: normal
status: tested
affects: [harness-api, ci-governance]
---

# WI-250: CLI コマンドリストの canonical 化と乖離検出ゲート

> 起票日: 2026-07-10
> 経緯: WI-247 で ci-governance の `HarnessApiCommandExistenceAdapter` に infra ローカル定数として既知コマンドリスト（main.ts の CLI dispatch から手動抽出した実サーフェス）を暫定配置する方針が採られ、「harness-api への新 export は本 WI ではやらない（別 WI）」と明記された。本 WI がその follow-up。本質的問題は main.ts の `switch (command)` にコマンドを追加してもリストと**乖離しても誰も気づかない**こと。canonical な単一ソース + 乖離検出ゲートを作る。

## 設計判断（採用: 縮小案 = canonical 定数モジュール + conformance テスト）

main.ts の dispatch は 3300 行超の**ハードコード `switch (command)`** であり、データ構造ではない。switch 全体を map へリファクタするのはスコープ過大（設計方針 #3 に該当）。よって:

1. **canonical 定数モジュール**: `scripts/harness/harness-api/domain/value-objects/known-harness-commands.ts` を新設し、CLI 実サーフェスの完全な既知コマンド名一覧を `KNOWN_HARNESS_COMMANDS`（`readonly string[]`, ソート済み）として export する。harness-api は main.ts が属する unit（`@unit harness-api`）であり、domain 層は依存を持たず他 unit から import 可能なため配置先として依存方向的に正当（`domain → application → infrastructure/presentation` を保つ）。既存 `CommandRegistry` は `phasegate:` prefix 必須で全 CLI サーフェス（`lint` / `init` / `baseline` 等の非 prefix コマンド）を表現できないため canonical ソースには使えず、本モジュールが別途必要。
2. **ci-governance adapter のデフォルト化**: `HarnessApiCommandExistenceAdapter` のコンストラクタデフォルトを canonical 定数の import に差し替える（コンストラクタ注入は温存）。WI-247 で暫定配置された infra ローカル定数 `KNOWN_HARNESS_COMMANDS` の重複定義は削除し、単一ソースへ一本化する。
3. **乖離検出 conformance テスト**: main.ts を実ファイルとしてパースし `switch (command)` 内の全 `case "..."` ラベルを抽出、canonical 定数と集合一致することを検証。main.ts にコマンドを追加/削除して定数を更新し忘れると fail する（= 乖離検出ゲート）。あわせて adapter デフォルトが canonical と一致すること・実在コマンド `phasegate:status` true / 偽コマンド false の回帰も検証。

## Acceptance Criteria

- AC-1: `KNOWN_HARNESS_COMMANDS` が harness-api domain 層に単一定義され、export される
- AC-2: `HarnessApiCommandExistenceAdapter` のデフォルト known commands が canonical 定数と一致する（infra 側の独自ハードコードを持たない）
- AC-3: conformance テストが main.ts の `switch` case ラベル集合と canonical 定数の集合一致を検証し、乖離時に fail する
- AC-4: 実在コマンド `phasegate:status` は exists=true、偽コマンドは exists=false
