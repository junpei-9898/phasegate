---
adr_id: "039"
title: "hook の authorization 単位は観測可能な state とし、skill 名を伝播しない"
status: Accepted
date: 2026-08-06
---

# hook の authorization 単位は観測可能な state とし、skill 名を伝播しない

<!-- @work-item-id WI-375 -->
<!-- @work-item-id WI-376 -->

## Context

pre-tool-use hook には「呼び出し元 skill 名」を受け取る口が 2 つ実装されていた。

- hook input JSON の `caller_skill` フィールド（`scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` の `PreToolUseHookInput`）
- 環境変数 `PHASEGATE_CALLER_SKILL`（同ファイルの `input.caller_skill ?? process.env.PHASEGATE_CALLER_SKILL`）

WI-202 はこれを「block guidance の出し分けにのみ使う optional context」として設計した。しかし **値を供給する producer はどこにも存在しない**。

1. **Claude Code の PreToolUse payload に skill 情報が無い。** hook に渡る JSON は `session_id` / `transcript_path` / `cwd` / `hook_event_name` / `tool_name` / `tool_input` / `permission_mode` であり、実行中の skill を示すフィールドは規定されていない。`caller_skill` は phasegate が独自に期待しているだけの未定義キーである。
2. **配布物の `.claude/settings.json` にも `.codex/hooks.json` にも `PHASEGATE_CALLER_SKILL` を設定する env 宣言が無い。** skill 側（`skills/*/SKILL.md`）にも export する手順は書かれていない。
3. 結果として `callerSkill` は常に `undefined` で hook に届き、`callerSkill === "quick-implementor"` の分岐は **到達不能なデッドパス**だった。それでも `HandlePreToolUseUseCase` を直接 new して `callerSkill: "quick-implementor"` を渡す統合テストは緑になっており、「実運用では一度も通らない経路が、テスト上は被覆されている」という**偽の被覆**を生んでいた（GitHub #27 Defect C / #44 課題 1）。

WI-354 で guidance 分岐の一次条件を `dominantCategory`（Quick Mode の分類結果）に変更したため実害は解消済みだが、「カテゴリ未確定時のみ `callerSkill` を見る」フォールバックと受け口自体は残っていた。

さらに本質的な問題として、**skill 名は仮に producer を作っても認証されない自己申告値である**。hook を呼ぶのはエージェント自身であり、`caller_skill: "quick-implementor"` を名乗ることは誰にでもできる。ADR-030（injection threat model）の trust root の考え方に照らせば、エージェントが自由に制御できる文字列は防御判定の入力にできない。GitHub #26 で「skill 名で full mode を許可する」案を退け、`phasegate config:plan --apply` のような **managed command 経路**（phasegate 自身が実行し、その痕跡をファイルとして残す経路）に倒した結論と同根である。

## Decision

### 1. authorization / guidance の入力は「hook が自ら観測・検証できる state」に限る

pre-tool-use hook の判定と案内は、以下の観測可能な state のみを入力とする。

| state | 実体 | 観測方法 |
|-------|------|---------|
| 書き込み対象パスと変更カテゴリ | `tool_input` から抽出した対象パス、Quick Mode の `dominantCategory` | hook 自身が分類（`quick-mode` unit） |
| Full Mode session marker | `phasegate session begin --mode full --unit … --work-item …` が作るセッションファイル（WI / unit / 期限） | `FileSystemFullModeSessionQueryAdapter` がファイルを読む |
| 設計文書の存在 | `docs/product/construction/{unit}/logical_design.md` / `domain_model.md` | `PhaseGateQueryAdapter.checkDesignDocsExist` |
| WI の承認・reflection 状態 | inception 配下の WI 文書、story reflection | 各 query adapter がファイルを読む |
| 解決済み config | `phasegate.config.json` + 防御プリセット解決結果 | config-foundation 経由 |
| baseline / attestation | `.phasegate/baseline.json`、attestation マニフェスト | ci-governance / attestation unit |

これらはすべて「phasegate 自身の managed command が書いた痕跡」または「リポジトリの実ファイル」であり、hook 実行時点で独立に再検証できる。

### 2. エージェントの自己申告 identity は受け取らない

skill 名・エージェント種別のような自己申告値は、**authorization にも guidance 分岐にも使わない**。よって受け口を削除する。

- `PreToolUseHookInput.caller_skill` フィールドを削除する
- 環境変数 `PHASEGATE_CALLER_SKILL` の参照を削除する
- `HandlePreToolUseInput.callerSkill` を削除する
- `shouldGuideQuickModeRelax` の `callerSkill === "quick-implementor"` フォールバックを削除する（判定は `dominantCategory` のみ）
- `callerSkill` を注入するだけで成立していた統合テストを削除し、代わりに **category ベースの分岐が WI-354 の挙動のまま不変であること**を回帰テストで固定する

「使われていない口を念のため残す」ことは、偽の被覆を生み、将来「値さえ入れれば許可が広がる」という誤った拡張余地を残すため採らない。

### 3. skill context が必要になった場合の唯一の入口は managed command

将来「どの skill が書いているか」に応じて挙動を変える必要が生じた場合も、hook input に新しい自己申告フィールドを足すことはしない。skill 側に `phasegate session begin` 等の **managed command を実行させ、その結果として生まれた検証可能な state**（session marker のフィールド）を hook が読む方式のみを採る。この経路では phasegate が引数を検証し、期限・unit・WI を自ら記録するため、値の出所が hook から追跡できる。

## Consequences

- pre-tool-use hook の入力契約から `caller_skill` が消える。未定義キーを送っていた呼び出し元があっても、hook は追加キーを無視するため互換性は壊れない（そもそも producer が存在しない）。
- Full Mode ブロック時の復旧案内は `dominantCategory` のみから決まる。`bugfix` / `docs` / `test` / `config` は quick-mode-relax 案内、`feature` / `domain` / `api` および**カテゴリ未確定**は `/story-implementor` 案内という WI-354 の挙動が唯一の仕様となる（カテゴリ未確定時に skill 名で分岐が変わる可能性が消える）。
- 「テストは緑だが実運用では到達しない」経路が 1 件減る。今後 hook の分岐を追加する際は、入力が上表の observable state に由来するかを ADR の基準として確認する。
- 経緯: WI-202（受け口の追加）→ WI-206（skill 名を許可条件にしない方針の調査）→ #26（managed command 経路への結論）→ WI-354（guidance の category ベース化）→ 本 ADR（受け口の削除と原則の明文化）。

## Alternatives

1. **producer を実装する（`.claude/settings.json` の env に `PHASEGATE_CALLER_SKILL` を埋める / skill 側で export させる）。** 値はエージェントが自由に設定できる自己申告であり、authorization の入力としては防御にならない。guidance 専用に限定しても、配布物の env 設定はユーザーの settings 編集に依存し、欠落時に静かに分岐が消えるため、category ベース判定より劣る。
2. **現状維持（受け口を残したまま到達不能分岐を放置）。** デッドパスと偽の被覆が残り、`callerSkill` を「渡せば許可が変わるフック」と誤解した拡張を招く。
3. **Claude Code 側の payload 拡張を待つ。** phasegate は AI 非依存（ADR-006）を掲げており、特定エージェントの payload 拡張に防御設計を依存させない。
