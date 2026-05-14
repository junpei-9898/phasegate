---
id: WI-194
type: issue
severity: high
status: tested
affects: [ci-governance, installation]
source: github#19
external_ref: https://github.com/junpei-9898/phasegate/issues/19
---

# WI-194: Remaining CI templates still assume pnpm and monorepo harness scripts

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #19。WI-183 / WI-189 follow-up。`consistency-check` と `agent-context-refresh` templates がまだ pnpm 前提を残している。

## 問題

`aidlc-gate` と `pre-commit` は package-manager autodetection と `npx phasegate` invocation に寄せたが、`ci:generate-template --type consistency-check|agent-context-refresh --render` は `pnpm/action-setup`, `pnpm install --frozen-lockfile`, `pnpm run harness ...` を出力する。

## 再現概要

```text
$ npx phasegate ci:generate-template --type consistency-check --render
cache: 'pnpm'
uses: pnpm/action-setup@v4
run: pnpm install --frozen-lockfile

$ npx phasegate ci:generate-template --type agent-context-refresh --render
run: pnpm run harness ci:auto-refresh-agent-context --apply
```

## 影響

- npm / yarn downstream project の workflow が install 時点で失敗する。
- `agent-context-refresh` が repository-local `harness` script の存在を仮定し、packaged CLI contract と矛盾する。

## 受け入れ基準

- [ ] `consistency-check.yml` が package-manager autodetection を使う。
- [ ] `agent-context-refresh.yml` が package-manager autodetection を使う。
- [ ] `agent-context-refresh` は `pnpm run harness ...` ではなく `npx phasegate ci:auto-refresh-agent-context --apply` を使う。
- [ ] `ci:generate-template --render` と bundled workflow template の一致 test が更新される。
