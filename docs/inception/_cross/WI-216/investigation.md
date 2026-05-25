# WI-216 Investigation: Existing skills directory merge / uninstall contract

## Scope

<!-- @work-item-id WI-216 -->

調査対象は `phasegate install`, `phasegate reconcile` / `update-skills`, `phasegate doctor`, `phasegate uninstall` の skills 配布と撤去である。personal / project の両 install mode と Claude / Codex の両 agent を対象にする。

## 現状確認

### Personal install

`RunInstallUseCase.execute()` は personal mode で agent ごとの real directory を扱う。

- Claude: `.claude/skills`
- Codex: `.codex/skills`

該当実装は `planPersonalSkillDirectory()` で、次の条件を unmanaged と判定する。

```ts
const unmanagedExisting = pathExists && (current === null || manifestEntry === null);
const changed = !unmanagedExisting && (current === null || !current.includes(expectedNeedle));
```

このため、`.harness-version` が存在しても `.phasegate/manifest.json` に entry が無い既存 directory は `repairMode: manual`, `changed: false` になり、copy されない。

手元の dry-run では次の plan になった。

```json
{
  "path": ".claude/skills",
  "action": "will-merge",
  "repairMode": "manual",
  "strategy": "copy-dir",
  "changed": false,
  "summary": ".claude/skills: existing non-phasegate directory requires manual review"
}
```

`--force` を付けても `changed: false` のためコピー対象にはならない。

### Project install

project mode は root `skills/` を shared catalog とし、`.claude/skills` / `.codex/skills` は `../skills` symlink にする。WI-210 で root `skills/` 配布は追加済みだが、既存 `skills/` がある場合の contract はまだ粗い。

`planSharedSkillDirectory()` は required bundled skill の `SKILL.md` 不足、`.harness-version` の version / skillSet mismatch、manifest entry 不足を見て `changed` を決める。`deploySharedSkills()` は selected bundled skill directory を一度 `rm -rf` してから copy するが、selected bundled skill 名以外の directory は触らない。この性質は user-owned skill 保持に使える。

### Doctor

`ClaudeSkillsSymlinkCheck` / `CodexSkillsSymlinkCheck` は `skillDirectoryLooksValid(files)` を使い、skill target の存在確認を行う。ただし required bundled skill の完全性、`.harness-version` の version / skillSet、manifest adoption 状態までは contract として明示されていない。

### Uninstall

`RunUninstallUseCase` は manifest entries を唯一の撤去対象とする。manifest が無い場合は manual cleanup を返す。

created directory entry は `planCreatedDirectory()` で directory 全体を削除する。personal `.claude/skills` / `.codex/skills` が directory entry として manifest に入ると、user-owned skill が混在していても directory 全体削除になり得る。

project install では WI-210 のテストにより root `skills/` の user-owned skill は保持されるが、personal install の real skills directory でも同等の粒度が必要である。

## Gap

| Area | Gap |
|---|---|
| personal install | `.harness-version` 付き旧 PhaseGate directory が manifest 無しという理由だけで refresh されない |
| personal install | missing bundled skill の個別検出がなく、directory 単位の version だけに依存している |
| project install | 既存 root `skills/` を持つ repo で user-owned skill と bundled skill の境界 contract が docs / doctor に十分出ていない |
| doctor | required bundled skill の不足・stale version・selection mismatch を明示的に検出できていない |
| uninstall | personal real skills directory を directory 全体削除すると user-owned skill を巻き込む恐れがある |
| reconcile | legacy personal skills directory を manifest に採用して refresh / uninstall 可能にする導線がない |

## Proposed Direction

1. skills 配布を directory 単位ではなく bundled skill 単位の managed target として扱う。
2. `.harness-version` は directory metadata として残しつつ、manifest には selected bundled skill entries を記録する。
3. install / reconcile は selected bundled skill directory だけを refresh し、unknown skill directory は user-owned として保持する。
4. legacy `.harness-version` 付き directory は PhaseGate-managed candidate として adoption 可能にする。
5. uninstall は manifest-managed bundled skill entries だけを削除し、directory が空になった場合だけ parent skills directory を削除する。
6. doctor は agent target topology と bundled skill completeness を分けて診断する。

## Test Strategy

- Integration: personal Claude existing `.claude/skills` with stale `.harness-version` and missing bundled skills is refreshed.
- Integration: personal Codex existing `.codex/skills` with user-owned skill preserves that skill during install and uninstall.
- Integration: project install with existing root `skills/user-owned/SKILL.md` refreshes bundled skills and preserves user-owned skill.
- Integration: uninstall after adopted legacy personal skills removes bundled skills but leaves user-owned skills.
- Unit: plan logic classifies legacy `.harness-version` directory as adoptable instead of manual.
- Unit: doctor check reports missing required bundled skill and stale skillSet/version.

## Open Decisions

- Whether personal skills manifest should record each `.<agent>/skills/{skill}` entry or one directory entry plus an allowlist of bundled skill names. Per-skill entries are safer for uninstall.
- Whether legacy adoption should require `.harness-version` only, or additionally require at least one known bundled skill with matching `SKILL.md`.
- Whether stale bundled skill directories should be backed up before overwrite when user modifications are detected inside a known bundled skill directory.
