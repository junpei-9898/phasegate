---
id: WI-216
type: issue
severity: high
status: tested
affects: [installation, setup, agent-integration, documentation]
source: user-feedback
---

# WI-216: 既存 skills ディレクトリがある install / uninstall で PhaseGate skills が同期されない

> 起票日: 2026-05-25
> 起票経緯: `npx phasegate install --personal --agent claude --apply` 実行後、`.claude/skills` が既に存在する環境で新しい bundled PhaseGate skills が注入されていないことを確認した。続けて通常 install / Codex personal / uninstall も同じ観点で仕様整理が必要と判断した。

## 問題

PhaseGate install は agent skills の既存ディレクトリを「ユーザー所有の可能性がある」と見て保守的に扱うが、現在の判定は強すぎる。既存ディレクトリが旧 PhaseGate install 由来である場合も `manual review` 扱いになり、新しい bundled skills が追加・更新されない。

確認した代表例:

```json
{
  "path": ".claude/skills",
  "repairMode": "manual",
  "changed": false,
  "summary": ".claude/skills: existing non-phasegate directory requires manual review"
}
```

この状態では `.claude/skills/.harness-version` が存在し、既存 PhaseGate skills も入っているにもかかわらず、manifest entry が無いだけで install が止まる。結果として root `skills/` には存在する `phasegate-config-doctor` / `phasegate-toolkit-guide` が `.claude/skills/` に入らない。

## 期待する契約

### Personal install

`phasegate install --personal --agent claude|codex|both --apply` は team-owned files を変更せず、選択 agent の real runtime skills directory を同期する。

- Claude: `.claude/skills/`
- Codex: `.codex/skills/`

既存ディレクトリがある場合でも、PhaseGate-managed bundled skill だけを追加・更新する。ユーザー独自 skill は保持する。旧 PhaseGate install 由来と判断できる `.harness-version` 付きディレクトリは、manifest が無くても legacy managed directory として採用し、次回以降 uninstall 可能な manifest entry を作る。

### Project install

`phasegate install --agent claude|codex|both --apply` は root shared catalog `skills/` に selected bundled skills を同期し、agent 側は symlink から参照する。

- Claude: `.claude/skills -> ../skills`
- Codex: `.codex/skills -> ../skills`

root `skills/` が既に存在していても、PhaseGate-managed bundled skill だけを追加・更新する。ユーザー独自 skill は保持する。既存 `.claude/skills` / `.codex/skills` が symlink ではない実ディレクトリの場合は、破壊的に置換せず、doctor / install plan で明確な migration guidance を出す。

### Uninstall

`phasegate uninstall --apply` は PhaseGate が追加・更新した bundled skill だけを剥がす。

- personal install では `.claude/skills` / `.codex/skills` の中から PhaseGate-managed bundled skill を削除し、ユーザー独自 skill が残る場合は親ディレクトリを残す。
- project install では root `skills/` の PhaseGate-managed bundled skill と agent symlink を削除し、ユーザー独自 skill は保持する。
- install が legacy `.harness-version` 付き directory を採用した場合も、manifest に記録された managed targets だけを uninstall 対象にする。

## 受け入れ基準

- [ ] personal Claude install は、既存 `.claude/skills/` がある場合でも missing / stale bundled PhaseGate skills を追加・更新する。
- [ ] personal Codex install は、既存 `.codex/skills/` がある場合でも missing / stale bundled PhaseGate skills を追加・更新する。
- [ ] personal `--agent both` は Claude / Codex の両方で同じ同期 contract を満たす。
- [ ] project Claude install は、既存 root `skills/` がある場合でも selected bundled skills を同期し、`.claude/skills -> ../skills` から参照できる。
- [ ] project Codex install は、既存 root `skills/` がある場合でも selected bundled skills を同期し、`.codex/skills -> ../skills` から参照できる。
- [ ] `--skills core|all` の selection に従い、不要な bundled skill は新規追加しない。selection 外の user-owned skill は削除しない。
- [ ] `.harness-version` を持つ旧 PhaseGate skills directory は、manifest が無くても legacy managed directory として採用できる。
- [ ] user-owned skill directory は install / reconcile / uninstall のいずれでも削除・上書きされない。
- [ ] `phasegate reconcile --apply` / `phasegate update-skills --apply` は、既存 install の missing / stale skills を修復できる。
- [ ] `phasegate doctor --agent claude|codex|both --json` は symlink / directory の存在だけでなく、required bundled skill の実体不足と stale `.harness-version` を検出する。
- [ ] `phasegate uninstall --apply` は PhaseGate-managed bundled skill だけを削除し、user-owned skill が残る directory は保持する。
- [ ] `phasegate uninstall --apply` は agent skill symlink だけを安全に unlink し、非管理の実ディレクトリや別 target symlink は manual review とする。
- [ ] README / `docs/guide/installation.md` / `docs/guide/setup-artifacts.md` は personal と project の skills topology、既存 skills との merge contract、uninstall の保持ルールを説明する。

## 非スコープ

- Claude Code / Codex 本体の skill discovery 仕様変更。
- personal install の agent context path 修正。これは WI-215 で扱う。
- bundled skill 内容そのものの改訂。
- user-owned skill の validation / packaging / publish 機能。

## 関連

- WI-209: personal install が symlink ではなく real runtime artifacts を作る契約を導入した。
- WI-210: project install が root shared skills を配布する契約を導入した。
- WI-213: personal install の core defenses を local-only に配布する契約を導入した。
- WI-215: personal install の agent context 配置が runtime discovery とずれている問題。
