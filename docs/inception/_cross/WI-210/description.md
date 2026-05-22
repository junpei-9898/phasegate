---
id: WI-210
type: issue
severity: high
status: tested
affects: [installation, documentation]
source: dogfood
---

# WI-210: Project install should deploy shared skills for agent skill links

> 起票日: 2026-05-22
> 起票経緯: `phasegate@0.160.15` 公開後の dogfooding で、non-personal `install` 導線が `.claude/skills` / `.codex/skills` symlink を作る一方、リンク先の `skills/` 実体を配布しないことを確認した。

## 問題

公開版 `phasegate@0.160.15` で次を実行すると、project/team install は agent hook・config・Husky・CI を作成し、`doctor` も green になる。

```bash
npx --yes phasegate@latest install --agent both --with-husky --with-ci --apply
```

しかし `.claude/skills -> ../skills` と `.codex/skills -> ../skills` のリンク先である root `skills/` は空で、`skills/phasegate-toolkit-guide/SKILL.md` などが存在しない。`update-skills --apply` / `reconcile --apply` でもこの状態は修復されなかった。

一方、legacy `init --agent both --with-husky --with-ci --yes` 導線では `skills/` に bundled skills が配布され、Claude / Codex の skill discovery は symlink 経由で動作した。

## ユーザー価値

推奨導線である `phasegate install` を使うユーザーが、追加の deprecated `init` を使わずに、Claude Code / Codex の hooks と skills を同時に利用できる。

## 受け入れ基準

- [ ] `phasegate install --agent claude --apply` は root `skills/` に selected bundled skills を配布し、`.claude/skills` から参照できる。
- [ ] `phasegate install --agent codex --apply` は root `skills/` に selected bundled skills を配布し、`.codex/skills` から参照できる。
- [ ] `phasegate install --agent both --apply` は root `skills/` に selected bundled skills を配布し、Claude / Codex の両方の skill links から参照できる。
- [ ] `phasegate install --skills core|all` の selection が root `skills/` 配布内容と manifest hash に反映される。
- [ ] `phasegate reconcile --apply` または `update-skills --apply` は、既存 install の空 `skills/` を修復できる。
- [ ] `phasegate doctor --agent claude|codex|both --json` は skill link だけでなく link target の bundled skill 実体不足を検出する。
- [ ] `phasegate uninstall --apply` は manifest 管理された shared `skills/` と agent skill links だけを削除し、非管理の user skills を誤削除しない。
- [ ] README / guide / setup artifacts は project install が shared skills を配布する contract と、personal install が real per-agent skill directories を配布する contract を区別して説明する。
- [ ] 公開版 package dogfooding で `npx phasegate@latest install --agent both --with-husky --with-ci --apply` 後に `skills/phasegate-toolkit-guide/SKILL.md`、`.claude/skills/phasegate-toolkit-guide/SKILL.md`、`.codex/skills/phasegate-toolkit-guide/SKILL.md` が存在する。

## 非スコープ

- personal install の real per-agent skill directory contract の変更。
- Claude Code / Codex 本体の skill discovery 実装変更。
- deprecated `init` の新規機能追加。

## Dogfood Evidence

2026-05-22 に `phasegate@0.160.15` で確認した。

| Mode | Command | Result |
|---|---|---|
| personal | `npx --yes phasegate@latest install --personal --agent both --apply` | `.claude/skills` / `.codex/skills` は real directories で bundled skills が存在。doctor green。 |
| project install | `npx --yes phasegate@latest install --agent both --with-husky --with-ci --apply` | `.claude/skills -> ../skills` / `.codex/skills -> ../skills` は作成されたが `skills/phasegate-toolkit-guide/SKILL.md` は存在しない。doctor は green のため不足を検出できていない。 |
| project init | `npx --yes phasegate@latest init --agent both --with-husky --with-ci --yes` | `skills/` に bundled skills が配布され、Claude / Codex の symlink 経由参照も成功。 |

## 関連

- WI-209: personal install を symlink shim ではなく real runtime artifacts に変更した。
