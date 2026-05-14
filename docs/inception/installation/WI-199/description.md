---
id: WI-199
type: issue
severity: high
status: tested
source: github#24
external_ref: https://github.com/junpei-9898/phasegate/issues/24
---

# WI-199: Mark protected files in uninstall plans

> 起票日: 2026-05-15
> 起票経緯: GitHub Issue #24。v0.160.6 dogfood で `uninstall --dry-run --json` が protected `package.json` mutation を警告なしに計画することを確認。

## 問題

`package.json` は protected file として扱われるべきだが、uninstall planner の JSON plan は protected status を表現しない。`refused` も空のため、automation agent は protected-file mutation を hard-coded allowlist なしに検出できない。

## Dogfood 再現

検証用一時コピー `/private/tmp/phasegate-issue-dogfood/repo24` で実施。

```text
$ phasegate install --apply --force --json
[exit 0]

$ phasegate uninstall --dry-run --json
{
  "path": "package.json",
  "action": "reverse-merge",
  "repairMode": "mechanical",
  "strategy": "package-json",
  "changed": true,
  "summary": "package.json: remove managed portion",
  "diff": "~ 2668 bytes -> 2157 bytes"
}
"refused": []
```

## 影響

- `uninstall --apply` を automation から実行すると protected file を warning なしで変更し得る。
- pre-tool-use hook が守るはずの protected file policy を Phasegate 自身の lifecycle command が迂回する。
- JSON consumer は protected mutation を判定するために独自 path list を持つ必要がある。

## 受け入れ基準

- [x] uninstall plan entry が protected file の場合、JSON で `protected:true` または同等の machine-readable marker を返す。
- [x] apply 時は protected mutation を既定で refuse するか、明示 acknowledgement flag を要求する。
- [x] top-level warning または refused reason が protected path を列挙する。
- [x] tests が `package.json` と `package-lock.json` など protected candidates を検証する。

## Verification

- `pnpm exec vitest run scripts/harness/__tests__/integration/installation/uninstall-handler.test.ts`
- `pnpm test`
- `pnpm harness:check-ready`
