---
id: WI-209
type: story
severity: high
status: tested
affects: [installation, setup, agent-integration, documentation]
source: user-feedback
---

# WI-209: Personal install should expose real agent runtime directories

> 起票日: 2026-05-22
> 起票経緯: WI-208 の公開後、ユーザーから「`.claude/settings.json` と `.claude/skills` を symlink にすると Claude Code が適切に動かない可能性がある。`.codex` も同様に扱うべき」とフィードバックがあった。

## 問題

WI-208 では personal install の実体を `.phasegate-local/` に集約し、Claude Code が読む root `.claude/settings.json` と `.claude/skills` を symlink shim として作成した。

この設計は filesystem read が symlink を辿る前提では動くが、agent runtime 側が `lstat` で実ディレクトリを要求する、symlink target を discovery 対象外にする、または trusted project config として symlinked settings を扱わない場合に不安定になる。

Codex も同様に、project-local `.codex/hooks.json` / `.codex/skills` を symlink shim にすると runtime discovery の挙動が agent 実装に依存する。

## ユーザー価値

personal install を使うユーザーが、チーム所有ファイルを変更せずに、Claude Code / Codex の project-local discovery contract に近い実体ファイル・実体ディレクトリを得られる。

## 受け入れ基準

- [x] `phasegate install --personal --agent claude --apply` は `.claude/settings.json` を symlink ではなく実ファイルとして作成する。
- [x] `phasegate install --personal --agent claude --apply` は `.claude/skills/` を symlink ではなく実ディレクトリとして作成する。
- [x] `phasegate install --personal --agent codex --apply` は `.codex/hooks.json` を symlink ではなく実ファイルとして作成する。
- [x] `phasegate install --personal --agent codex --apply` は `.codex/skills/` を symlink ではなく実ディレクトリとして作成する。
- [x] `phasegate install --personal --agent both --apply` は Claude / Codex の両方に実体 runtime artifacts を作成する。
- [x] `.phasegate-local/phasegate.config.json` は引き続き personal config fallback として作成される。
- [x] `.git/info/exclude` は `.phasegate-local/`, `.phasegate/`, `.claude/`, `.codex/`, `skills/`, root `phasegate.config.json` を local-only として隠す。
- [x] `package.json`, `CLAUDE.md`, `AGENTS.md`, `.husky/*`, `.github/workflows/*`, `.gitignore`, GitHub CLI config, repo secrets, CI config は personal apply 対象外のまま。
- [x] 既存 `.claude/*` / `.codex/*` が非 PhaseGate 管理の実体または symlink の場合は上書きせず manual/refused として扱う。
- [x] `phasegate doctor --agent claude|codex --json` は実体 runtime artifacts を valid と判定できる。
- [x] `phasegate uninstall --apply` は PhaseGate-managed personal runtime artifacts だけを削除し、team-owned files と非管理の agent files を変更しない。
- [x] README / guide / setup artifacts / setup skills の説明は symlink shim ではなく real project-local runtime artifacts として更新される。

## 非スコープ

- GitHub CLI authentication, repo secrets, hosted CI settings の自動設定。
- team-owned `CLAUDE.md` / `AGENTS.md` への managed section merge。
- team `.gitignore` の編集。
- Claude Code / Codex 本体の runtime discovery 実装変更。

## 関連

- WI-208: personal install が `.phasegate-local/` sandbox と symlink shim を導入した。
- WI-207: personal mode が team-owned files を apply から除外した。
