---
id: WI-174
type: story
severity: high
status: tested
affects: [setup, installation, ci-governance, agent-integration, documentation]
source: internal
---

# WI-174: Agent Context Files as Managed Setup Targets

> 起票日: 2026-05-12
> 起票経緯: `phasegate init/install` が `.claude/settings.json` / `.codex/hooks.json` / skills 導線は配置する一方で、agent が実際に読む `CLAUDE.md` / `AGENTS.md` を初期生成せず、`ci:auto-refresh-agent-context` も `AGENTS.md` を lesson pointer 集約として扱うため、PhaseGate のセットアップ状態と agent context 文言が同期しないことを確認した。

## 背景

現状の `phasegate init --agent claude|codex|both` は、agent runtime の hook / skill 導線を作成するが、repo root の `CLAUDE.md` / `AGENTS.md` は作成しない。

- `--agent claude`: `.claude/settings.json` と `.claude/skills` は作るが、`CLAUDE.md` は作らない。
- `--agent codex`: `.codex/hooks.json` と `.codex/skills` は作るが、`AGENTS.md` は作らない。
- `--agent both`: 両 agent の runtime artifact は作るが、両 agent context file は作らない。
- `refresh-claude-md` は `CLAUDE.md` の template-driven refresh を持つ。
- `ci:auto-refresh-agent-context` の `AGENTS.md` 側は lesson artifact から pointer list を生成するため、PhaseGate の標準運用ルール文書としては生成されない。

このため、初回セットアップ直後の agent は PhaseGate の WI workflow、hook bypass policy、必読 docs、agent 別 next step を `CLAUDE.md` / `AGENTS.md` から学習できない。さらに、後続 refresh によって既存の人間向け `AGENTS.md` が pointer list に縮退するリスクもある。

## 問題

### 1. セットアップ成果物と agent context が非同期

`phasegate install/init` は hook と skills を配置するが、agent に伝えるべき運用文言を配置しない。結果として「PhaseGate は入ったが agent が PhaseGate の使い方を知らない」状態が成立する。

### 2. CLAUDE.md と AGENTS.md の扱いが非対称

`CLAUDE.md` は template-driven refresh を持つが、`AGENTS.md` は pointer 集約専用に寄っている。Codex 向けの標準文言を配る機構が不足している。

### 3. setup option に応じた文言分岐が無い

`--agent`, `--skills`, `--with-ci`, `--with-husky`, `--workflow strict` などに応じて、agent が知るべき next step / enabled guardrail / remaining manual action は変わる。しかし現状の template は setup result を反映しない。

### 4. lifecycle 管理対象として未整理

`install` / `reconcile` / `uninstall` の managed target に `CLAUDE.md` / `AGENTS.md` が含まれていないため、version upgrade 時の追従、既存 user content の保持、uninstall 時の managed block 除去が一貫しない。

## スコープ

### Phase 1: Agent context template 契約の整理

- `CLAUDE.md` と `AGENTS.md` の標準セクションを template 化する。
- 共通セクションと agent 固有セクションを分離する。
- user-owned section / phasegate-managed section の marker 契約を定義する。
- `AGENT.md` 単数を正式対象にするか、非対応 / migration warning にするかを仕様化する。

### Phase 2: setup option aware rendering

`phasegate init/install` の入力と実行結果に応じて、文言を出し分ける。

- `--agent claude`: `CLAUDE.md` を対象にし、Claude hooks / skills / enablement を説明する。
- `--agent codex`: `AGENTS.md` を対象にし、Codex hooks / skills / `codex features enable codex_hooks` を説明する。
- `--agent both`: 両方を対象にし、共有 skills と agent 別 hook 状態を説明する。
- `--skills core|all`: 利用可能 skill set と AIDLC 起動方法を変える。
- `--with-ci`: CI workflow と agent-context refresh workflow の存在を説明する。
- `--with-husky`: commit-msg / pre-push / pre-commit backstop の存在を説明する。
- `--workflow strict`: WI / inception / product reflection の要求を強調する。

### Phase 3: install / reconcile integration

- `phasegate install --apply` が agent context files を managed target として作成 / merge できるようにする。
- 既存 user content は marker 内または managed block 外として保持する。
- `reconcile --apply` が agent context template の managed portion だけを更新できるようにする。
- `uninstall --apply` が PhaseGate managed portion のみを除去できるようにする。

### Phase 4: AGENTS.md pointer refresh との共存

- lesson pointer 集約は `AGENTS.md` 全体を上書きせず、dedicated section に限定する。
- PhaseGate 標準運用ルールと lesson pointers が同居できる serialization を定義する。
- `ci:auto-refresh-agent-context` が `CLAUDE.md` / `AGENTS.md` の標準セクションと user section を破壊しないことを保証する。

## 受け入れ基準

- [x] `phasegate init/install --agent claude --apply` 相当の導線で `CLAUDE.md` の PhaseGate managed section が作成または merge される。
- [x] `phasegate init/install --agent codex --apply` 相当の導線で `AGENTS.md` の PhaseGate managed section が作成または merge される。
- [x] `--agent both` では `CLAUDE.md` / `AGENTS.md` の両方が対象になり、各 agent 固有の hook / skill 導線が説明される。
- [x] 既存 `CLAUDE.md` / `AGENTS.md` の user-owned content は破壊されない。
- [x] `--skills core|all`, `--with-ci`, `--with-husky`, `--workflow strict` の差分が文言に反映される。
- [x] `ci:auto-refresh-agent-context --apply` は `AGENTS.md` の標準運用ルールを pointer list で置き換えない。
- [x] lesson pointers は `AGENTS.md` の dedicated section に追加 / 更新される。
- [x] `reconcile --apply` で agent context managed section が新 template に追従する。
- [x] `uninstall --apply` で PhaseGate managed section のみが削除される。
- [x] `AGENT.md` 単数の扱いが docs / CLI output / tests で一貫する。
- [x] README / installation guide / Codex integration guide / Claude integration guide が、初回 setup 後に作られる agent context files を正しく説明する。

## 非スコープ

- Claude Code / Codex 本体の memory resolution 仕様変更
- agent runtime hook 実行仕様そのものの変更
- lesson artifact schema の再設計
- skills 個別内容の大規模改修

## 関連 WI

- WI-032: AGENTS.md / CLAUDE.md auto-refresh パイプライン。本 WI はその follow-up として `AGENTS.md` の標準文言保持と setup-aware rendering を扱う。
- WI-025: Codex 向け skills 導線。本 WI はその導線を agent context に反映する。
- WI-146: `phasegate install` structured merge。本 WI は agent context files を managed target に追加する。
- WI-148: `phasegate reconcile` / `init` deprecation。本 WI は reconcile 対象の拡張に関係する。
- WI-169: Installation lifecycle product construction completion。本 WI の完了後、product docs へ installation target と agent context lifecycle を反映する。

## 対応結果

`AGENTS.md` / `CLAUDE.md` templates と markdown managed merge / reconcile / uninstall を追加した。`AGENTS.md` lesson pointers は dedicated section に分離し、standard managed section と user-owned content を保持する。
