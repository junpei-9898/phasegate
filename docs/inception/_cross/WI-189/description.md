---
id: WI-189
type: issue
severity: normal
status: tested
affects: [ci-governance]
source: github#15
external_ref: https://github.com/junpei-9898/phasegate/issues/15
---

# WI-189: Umbrella UX and documentation inconsistencies in CLI commands

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #15 の umbrella items を再現確認。低優先度の UX/doc-level bug として 1 WI にまとめる。

## 再現結果

### G. `validate --format json` が fatal

```text
$ bin/phasegate validate --format json
Fatal: Invalid --format value for validate: 'json'. Supported values: human, agent, ci.
```

### H. CI templates が pnpm / monorepo 前提

`ci:generate-template --type aidlc-gate|pre-commit|consistency-check|agent-context-refresh --render` で `pnpm install --frozen-lockfile`、`HARNESS_CMD="npx tsx scripts/harness/main.ts"`、`pnpm run harness ...` を確認した。

### J. bypass audit の no-op message が staged files と言う

```text
$ bin/phasegate bypass:audit --base HEAD --head HEAD
[phasegate] Bypass audit (HEAD..HEAD)
[phasegate] No staged files to check. Skipping.
```

### K. scaffold-design が `--apply` なしで書き込む

```json
{
  "targetPath": "/private/tmp/phasegate-issue-repro-15k/docs/product/construction/u1/logical_design.md",
  "written": true,
  "alreadyExists": false
}
```

### L. scaffold-wi help text が main help と command usage で不一致

main help は `scaffold-wi <unit> <type>`、command usage は `<unit|_cross> <story|issue|chore>` を示す。

### M. config:plan が help に載らない command を推奨

`config:plan --intent quick-mode-strict --dry-run --json` が `phasegate check-change-category --paths <changed-files> --format json` を返すが、main `--help` には `check-change-category` が載らない。

### N. delegate-sonnet help が空で positional args が rejected

```text
$ bin/phasegate delegate-sonnet --help
Usage: phasegate delegate-sonnet [options]

$ bin/phasegate delegate-sonnet "some task"
Unknown option: some task
```

## 未再現/別 WI 扱い

- I. `uninstall --dry-run` の protected package.json annotation は、manifest 付き install state を sandbox 内で構築できず未確認。
- H のうち AIDLC workflow の nonexistent script は WI-183、pre-commit HARNESS_CMD は WI-182 で高優先度 issue として独立起票済み。

## 受け入れ基準

- [x] `validate --format json` の扱いが global `--json` と矛盾しない。
- [x] write-side command は `--dry-run|--apply` contract を統一するか、例外を help/docs に明示する。
- [x] main help と command-specific help が同じ positional signature を表示する。
- [x] `config:plan` が推奨する command は main help に掲載される。
- [x] `delegate-sonnet` の help が実際の引数 contract を説明し、main help と挙動が一致する。

## 実装メモ

- `validate --format json` と `validate --json` は既存 CI JSON formatter を使う。
- `scaffold-design` は default dry-run とし、`--apply` のみ書き込む。
- `bypass:audit` の empty range no-op は staged ではなく changed files in range と表示する。
- `scaffold-wi`, `scaffold-design`, `delegate-sonnet`, `check-change-category` の help surface を整合させる。

## 検証

- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/integration/ci-governance/scaffold-design-handler.test.ts scripts/harness/__tests__/unit/harness-api/pre-commit.test.ts scripts/harness/__tests__/e2e/cli-harness.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm exec tsx scripts/harness/main.ts validate --layer L2 --format json`
- `pnpm exec tsx scripts/harness/main.ts scaffold-design --unit demo --phase logical --json`
- `pnpm exec tsx scripts/harness/main.ts bypass:audit --base HEAD --head HEAD`
