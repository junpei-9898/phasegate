# WI-111 Logical Design

<!-- @work-item-id WI-111 -->

## Scope

WI-111 improves the reliability of the `L2-013 cli-e2e-test-existence` validator. The validator must distinguish real missing CLI E2E coverage from cases where PhaseGate cannot apply its own internal CLI E2E coverage rule, such as consumer projects that do not contain PhaseGate's internal E2E suite.

## Matching Rules

`CliE2eTestExistenceService` receives two inputs:

- registered public CLI command names from `CliCommandRegistryPort`
- E2E test file contents from `E2eTestFileRegistryPort`

The service treats a command as covered when the E2E content contains one of these evidence forms:

- direct CLI invocation: `run('command')`
- fixture scoped invocation: `runInCwd(..., 'command')`
- package-script style command mention such as `phasegate:ci-check`
- help or error assertion evidence such as `usage: phasegate command` or `unknown command: command`

Direct CLI commands and `phasegate:*` package-script commands are registered as separate command names. Legacy aliases that are not actual supported commands must not be registered as mandatory coverage targets.

## Classification

Coverage entries use three statuses:

- `covered`: command has matching E2E evidence
- `missing`: E2E suite exists, but a registered command has no matching evidence
- `limitation`: no CLI E2E suite exists in the current project, so PhaseGate cannot assert its own internal CLI command coverage

Only `missing` entries fail `L2-013`. `limitation` entries remain visible in the report model but do not fail the L2 gate.

## Execution Boundary

`L2-013` runs through `RunL2ValidatorsUseCase` after WI-110 established layer ownership. It is a public CLI contract coverage signal, not an L1 source hygiene validator.

