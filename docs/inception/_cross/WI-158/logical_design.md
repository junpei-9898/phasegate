# WI-158 Logical Design: Reporting Output Path Contract Normalization

@work-item-id WI-158

## Change Strategy

Normalize documentation around report output without changing implementation paths. The current implementation has multiple producers with different path contracts, so docs must avoid implying that `reporting.outputDir` controls all output.

## Output Contracts

- Phase dependency / phase-gate reporting uses resolved `reporting.outputDir`; `.harness/reports` is only a legacy fallback when config cannot be resolved by the provider.
- `doctor --report-out <path>` writes to the explicit path supplied by the caller.
- `phasegate:status --json` and `phasegate:detect-drift --json` write to stdout.
- Regression-suite result JSON is fixed under `reports/regression/`.

## Touched Surfaces

- `docs/guide/configuration.md`
- `docs/guide/cli-reference.md`
- `docs/product/construction/config-foundation/domain_model.md`
- `docs/product/construction/harness-api/coverage_report.md`
- `docs/product/units/harness-api_unit.md`
- `docs/product/units/harness-api_unit.md`
- `docs/product/units/integration_contract.md`

