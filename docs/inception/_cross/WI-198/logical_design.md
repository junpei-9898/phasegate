# WI-198 Logical Design

## Scope

Affected units: `ci-governance`, `installation`

## Design

1. Agent context rendering を shared renderer に寄せる。
   - `ci:auto-refresh-agent-context` は shared renderer で CLAUDE.md / AGENTS.md managed section を生成する。
   - `reconcile` も同じ renderer output で markdown-managed target を比較する。
2. Reconcile comparison は rendered managed section の normalize 後比較を行う。
   - trailing newline など content semantics のない差分で `changed:true` にしない。
3. package.json plan は agent-context refresh の副作用として changed にならない。
   - install/reconcile の package-json expected content と manifest hash の比較条件を確認する。

## Product Reflection Targets

実装前に以下へ `@work-item-id WI-198` を反映する。

- `docs/product/construction/ci-governance/logical_design.md`
- `docs/product/construction/ci-governance/it_test_design.md`
- `docs/product/construction/installation/logical_design.md`
- `docs/product/construction/installation/it_test_design.md`
