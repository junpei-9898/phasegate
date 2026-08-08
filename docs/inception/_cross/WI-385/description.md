---
id: WI-385
type: story
severity: high
status: tested
affects: [agent-integration, installation, harness-api]
source: user-request / Grok Build 1.0.0 / Antigravity CLI 1.0.14
---

# WI-385: Grok Build / Google Antigravity の編集前フェーズゲート対応

<!-- @work-item-id WI-385 -->

## 背景

Phasegate の PreToolUse 境界は Claude Code / Codex CLI の snake_case payload
（`tool_name` / `tool_input`）を前提としている。Grok Build は Claude Code hooks と
`.claude/settings.json` を公式に互換読取するが、payload は camelCase
（`toolName` / `toolInput`）である。現行 hook はこの payload を `tool_name` 欠落として
exit 2 にする一方、Grok が最優先で解釈する stdout の top-level deny JSON を返さない。

Google Antigravity CLI `agy` は `.agents/hooks.json` の PreToolUse を提供するが、payload は
`toolCall.name` / `toolCall.args` という別構造であり、現行 hook へ配線されていない。
2026-08-08 時点では IDE / 2.0 desktop で hook が発火しないという独立再現報告があり、
編集前 hard block を保証できるのは CLI surface に限られる。

## 目的

- agent 名ではなく payload 形状を検出し、3 形状を既存の canonical pre-tool input へ正規化する。
- Grok / Antigravity の deny 契約を stdout decision JSON で満たし、既存 Claude / Codex の
  exit 2 + stderr と allow 時空 stdout を回帰させない。
- Grok の Claude-compatible hook と Antigravity の named hook map を install / init / reconcile /
  doctor へ配線する。
- trust / runtime surface の観測不能・未対応範囲を docs と doctor で正直に案内し、L2
  pre-commit を共通 backstop として維持する。

## 受け入れ基準

- [ ] snake_case flat、camelCase flat、nested `toolCall` の実 payload fixture を構造検出し、
  agent 名・model 名・設定済み `--agent` を入力判定に使わない。
- [ ] Grok の `run_terminal_command{command}`、`search_replace{file_path,...}`、
  `write{file_path|防御的候補}`、`apply_patch{patch}` を既存 Bash / Edit / Write / patch 抽出へ写像する。
- [ ] Grok の `toolInputTruncated=true` かつ command / patch の全 target を保証できない入力は deny する。
- [ ] Antigravity の `write_to_file` / `replace_file_content` /
  `multi_replace_file_content` / `run_command` を `toolCall.args` の複数候補キーから抽出する。
- [ ] 対応対象の write tool で target または command を抽出できない場合は、silent allow せず deny する。
- [ ] snake_case deny は従来どおり stdout 空、stderr 非空、exit 2。camelCase flat deny は
  top-level `decision=deny` + Claude-compatible `hookSpecificOutput` + stderr + exit 2 を併記する。
- [ ] nested `toolCall` deny は top-level `decision=deny` + reason + stderr + exit 2 とし、
  未文書化の extra field に依存しない。
- [ ] 全形状の allow は exit 0、stdout 空を維持し、permission を先回りで上書きしない。
- [ ] `.claude/settings.json` template の phasegate PreToolUse command は matcher 全体として
  `Bash|Write|Edit|apply_patch` を覆い、各 command に timeout 30 秒を明示する。
- [ ] Grok 専用 `.grok/hooks` は二重発火回避のため配布せず、公式 Claude compatibility scanner を
  単一の managed hook source とする。
- [ ] `templates/.agents/hooks.json` は named hook map 形式、正規表現 matcher、timeout 30 秒で配布する。
- [ ] `install` / deprecated `init` / `setup:agent` / `doctor` の `--agent` は
  `grok` / `antigravity` / `all` を受理し、既存 `both=claude+codex` の意味と既定値を変えない。
- [ ] doctor は Grok compatible hook の matcher / timeout と Antigravity hook の schema /
  matcher / timeout を構造検査し、Grok trust と Antigravity CLI-only 制約を notice に出す。
- [ ] Grok では `grok inspect` / `/hooks` / `--trust` または `/hooks-trust` の確認を案内する。
- [ ] Antigravity docs は CLI `agy` のみ hard block 対応、IDE / desktop は L2 pre-commit が主防御と明記する。
- [ ] Claude / Codex payload、Bash heredoc、Codex native apply_patch、Quick / Full Mode の既存回帰が green である。
- [ ] template 変更と同じ Phase 2 commit で `phasegate integrity:pin` を実行し pin を更新する。

## 非目標

- Antigravity IDE / desktop の未発火問題を Phasegate 側で修復すること
- Antigravity global permissions を project gate の代替にすること
- Grok / Antigravity の agent 名、model 名、CLI version を authorization 入力にすること
- Antigravity の未文書化 exit code / fail-open・closed を Phasegate が保証済みと表現すること
- PostToolUse / Stop / SessionStart の全ランタイム機能を新規保証すること
- L2 pre-commit / CI backstop の撤去

## WI 構成判断

Grok と Antigravity を 1 件の cross-cutting story にまとめる。中核変更は同一の payload normalizer、
response profile、pre-tool process test、agent target enum、doctor scope に集中する。別 WI にすると同じ
presentation 入口と CLI union を並行変更し、agent 名分岐を誘発するため ADR-006 と変更原子性の両面で不利である。

影響 Unit は `agent-integration`、`installation`、`harness-api` とする。`quick-mode` は正規化後の既存
`targetChanges` contract をそのまま消費するため、設計参照・回帰テスト対象だが実装変更 Unit には含めない。

## Phase 1 の境界

本 WI は計画・設計と product 反映だけを行う。source、test code、template、README / guide、version、
integrity pin、commit / tag / push は Phase 2 承認後まで変更しない。
