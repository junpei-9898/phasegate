---
id: WI-183
type: issue
severity: high
status: tested
affects: [ci-governance, installation]
source: github#8
external_ref: https://github.com/junpei-9898/phasegate/issues/8
---

# WI-183: CI workflow templates call nonexistent pnpm harness scripts

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #8 の再現確認。`phasegate-aidlc-gate.yml` template が package scripts と一致しない command を生成する。

## 再現結果

`bin/phasegate ci:generate-template --type aidlc-gate --render` で以下を確認した。

```text
cache: 'pnpm'
run: pnpm install --frozen-lockfile
RESULT=$(pnpm run harness lint --json 2>&1)
RESULT=$(pnpm run harness harness:ci-check --json 2>&1)
```

`install --dry-run --force` でも `.github/workflows/phasegate-aidlc-gate.yml` が deploy 対象になる。

## 問題

- `install` が package.json に追加する scripts は `phasegate:lint` / `phasegate:check-ready` / `phasegate:doctor` であり、`harness` script は存在しない。
- npm/yarn project でも pnpm install 前提の workflow が配布される。
- `actions/setup-node` の `cache: 'pnpm'` が pnpm setup より前にある。

## 受け入れ基準

- [x] generated AIDLC workflow が install 直後の downstream project で存在しない npm script を呼ばない。
- [x] package manager 固定の template を避けるか、lockfile / packageManager に基づいて出し分ける。
- [x] `ci:generate-template --type aidlc-gate --render` と install deploy 先の workflow が同じ修正済み contract を満たす。

## 実装メモ

- `docs/templates/ci/aidlc-gate.yml` を lockfile 別 install に変更し、`pnpm run harness ...` ではなく `npx phasegate ...` を呼ぶ。
- install integration test と render integration test で workflow contract を検証。
