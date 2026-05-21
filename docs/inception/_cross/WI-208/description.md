---
id: WI-208
type: story
severity: high
status: tested
affects: [installation, setup, config-foundation, agent-integration, documentation]
source: user-feedback
---

# WI-208: Personal install sandbox should fully initialize local-only agent setup

> 起票日: 2026-05-21
> 起票経緯: WI-207 の dogfood 後、ユーザーから「personal を選んだ後は、それに応じて各種設定ファイルや skill の init 処理自体は自動で完了してほしい」「既存環境を汚さないように PhaseGate の設定ファイルを一つのフォルダにまとめて、そこで設定できるようにするのはどうか」とフィードバックがあった。

## 問題

WI-207 で `phasegate install --personal` は team-owned files を変更しないようになったが、実用開始に必要な agent runtime artifacts は自動初期化されない。

- Claude Code only の team repository で `install --personal --apply` しても `.claude/settings.json`, `.claude/skills`, `skills/` が作られない。
- Codex を使わない project でも Codex user-level hooks の manual action が目立ち、実際に必要な Claude Code の local-only setup が完了しない。
- `phasegate.config.json` は root に置かず `.phasegate-local/config.json` を作るが、PhaseGate command / hook / validator が personal config fallback として扱う契約が明確ではない。
- 手動で `.claude/` や `skills/` を作る案は、ユーザー期待の「personal を選んだら init 処理は自動完了する」と合わない。

## ユーザー価値

チーム所有リポジトリで、自分だけ Claude Code + PhaseGate を使いたいユーザーが、team-owned files を一切変更せずに次の状態へ到達できる。

```bash
npx phasegate install --personal --agent claude --apply
```

実行後:

- Claude Code hooks が動く。
- PhaseGate skills が使える。
- PhaseGate commands / validators が personal config を読む。
- `git status` に team に出すべき変更が出ない。
- さらに細かな config tuning は `phasegate-config-doctor` 等の setup skill で行える。

## 受け入れ基準

- [ ] `phasegate install --personal --agent claude --apply` が `.phasegate-local/` 配下に personal sandbox を作成する。
- [ ] personal sandbox は少なくとも config, manifest, skills, Claude Code settings を含む。
- [ ] Claude Code が読むために root には `.claude` shim または `.claude/settings.json` / `.claude/skills` symlink を作る。ただし `.git/info/exclude` により git 追跡対象へ出さない。
- [ ] 既存 `.claude` が存在する場合は上書きせず、dry-run / apply plan で manual review または refusal を返す。
- [ ] `package.json`, `CLAUDE.md`, `AGENTS.md`, `.husky/*`, `.github/workflows/*`, `.gitignore`, GitHub CLI config, repo secrets, CI config は personal apply 対象外のまま。
- [ ] `phasegate` commands / hooks / validators は root `phasegate.config.json` が無い場合に `.phasegate-local/phasegate.config.json` を personal fallback として読める。
- [ ] `phasegate uninstall --apply` は personal sandbox と root shim だけを削除し、team-owned files を変更しない。
- [ ] `phasegate doctor --agent claude --json` または setup planner が personal sandbox setup を team install と区別して表示できる。
- [ ] docs / README / setup skills が「personal を選ぶと local-only agent artifacts まで自動初期化される」導線に更新される。
- [ ] regression test が apply / uninstall 後に team-owned files の bytes が変化しないこと、かつ Claude Code local artifacts が作成 / 削除されることを固定する。

## 非スコープ

- GitHub CLI (`gh`) authentication, repo secrets, GitHub Actions enablement, hosted CI settings の自動設定。
- team-owned `CLAUDE.md` / `AGENTS.md` への managed section merge。
- team `.gitignore` の編集。
- 既存 team install の default behavior 変更。
- Codex user-level hooks の自動書き込み。Codex 利用時は引き続き manual external action とする。

## 設計メモ

候補ディレクトリ:

```text
.phasegate-local/
  phasegate.config.json
  manifest.json
  skills/
  claude/
    settings.json
    skills -> ../skills
  reports/
  cache/
```

Claude Code は root `.claude/settings.json` を読むため、root には ignored shim が必要。

候補:

```text
.claude -> .phasegate-local/claude
```

または:

```text
.claude/settings.json -> ../.phasegate-local/claude/settings.json
.claude/skills -> ../.phasegate-local/skills
```

既存 `.claude` がある team repository では、どちらも自動上書きしない。

## 関連

- WI-207: personal mode が team-owned files を plan/apply から除外し、`.phasegate-local/config.json` と `.git/info/exclude` を導入した。
- WI-174: `AGENTS.md` / `CLAUDE.md` managed sections。WI-208 では team-owned context files へは書かない。
- WI-205: Codex hooks feature flag guidance。WI-208 では Codex は manual external action として扱う。
