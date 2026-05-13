---
traceability:
  initial_creation: true
---

# WI-175 Implementation Plan

<!-- @work-item-id WI-175 -->

## Goal

`phasegate setup:agent` を「設定できる」から「何が完了し、何が外部 manual action として残っているかを確信できる」体験へ引き上げる。

## Proposed Slices

### Slice A: Completeness summary contract

1. `setup:agent` の plan DTO に `completeness` を追加する。
2. area は `local-config`, `agent-hooks`, `agent-context`, `skills`, `git-hooks`, `ci`, `validation`, `external-actions` から開始する。
3. status は `configured`, `planned`, `manual`, `not-applicable`, `unknown` とする。
4. 各 entry は `evidence`, `nextAction`, `risk` を持つ。
5. `setup:agent --dry-run --json` と `--apply --json` の両方で同じ形を返す。

### Slice B: Setup / install default alignment

1. agent context rendering defaults を一箇所へ集約する。
2. `setup:agent`, `install`, `reconcile` が同じ renderer input builder を使う。
3. direct `install` と intent-based `setup:agent` の差分は `intentReason` として plan に出す。
4. dogfood regression として、同一 option 再適用時の no-diff を検証する。

### Slice C: Config plan diff preview

1. `ConfigChangePlan` に `configPatch` を追加する。
2. `phasegate.config.json` が無い場合は `before: null`, `after` に proposed minimum config を出す。
3. 既存 config がある場合は JSON pointer 単位の before/after を出す。
4. `codex-hooks` のような local config 以外の intent は `externalActions` と `managedTargets` を分離する。

### Slice D: Doctor readiness split

1. `doctor` finding とは別に `readiness` summary を追加するか、`setup:agent` の completion summary に閉じるかを設計で決める。
2. local managed setup は green / yellow / red で判定する。
3. external manual-check は blocking と non-blocking を分ける。
4. human output で「doctor green でも残る作業」を明示する。

### Slice E: Permission-aware error handling

1. install / setup apply の write operation を target-aware error に変換する境界を特定する。
2. `EPERM` / `EACCES` / readonly / parent missing を分類する。
3. JSON output では `target`, `operation`, `code`, `recovery`, `partialChanges` を返す。
4. human output では retry guidance と rollback guidance を出す。

## Test Plan

<!-- @work-item-id WI-175 -->

- Unit tests:
  - completeness classifier
  - renderer input default builder
  - config patch builder
  - permission error mapper
- Integration tests:
  - `setup:agent --dry-run --json` includes completeness summary
  - `setup:agent strict --apply` then same command again is no-diff
  - `install --dry-run --agent both` explains any setup intent difference
  - `config:plan --intent l4-strict --json` returns before/after patch
  - `config:plan --intent codex-hooks --json` separates external actions
  - permission-denied filesystem adapter returns structured guidance
- Dogfood scenario:
  - temp project installs published package, runs setup / plan / doctor / uninstall, and records local readiness plus manual-check output.

## Product Reflection Targets

<!-- @work-item-id WI-175 -->

- `docs/product/construction/setup/logical_design.md`
- `docs/product/construction/installation/logical_design.md`
- `docs/product/construction/config-foundation/logical_design.md`
- `docs/product/construction/agent-integration/logical_design.md`
- `docs/product/construction/documentation/coverage_report.md`

## Open Questions

<!-- @work-item-id WI-175 -->

1. Should readiness live in `doctor`, `setup:agent`, or both?
2. Should `config:plan` emit RFC 6902 JSON Patch, a simpler JSON pointer diff, or both?
3. Should external manual-checks ever make `doctor` non-green, or should they remain separate advisory status?
4. Should direct `install` adopt `setup:agent recommended` defaults, or remain a lower-level primitive with explicit defaults?

## First Implementation Order

<!-- @work-item-id WI-175 -->

1. Add DTOs and tests for completeness summary.
2. Add setup completeness to `setup:agent --dry-run`.
3. Align renderer defaults and add no-diff regression.
4. Add config patch preview.
5. Add readiness/manual-check summary.
6. Add permission-aware error mapping.
7. Update public docs and dogfood scenario.

