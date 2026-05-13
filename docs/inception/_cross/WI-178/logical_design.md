# WI-178 Logical Design: Agent-Scoped Doctor Readiness

<!-- @work-item-id WI-178 -->

## Design

`phasegate doctor` keeps its default full-scope behavior for existing users, but accepts an optional agent scope:

- `phasegate doctor --agent both` or omitted: inspect Claude, Codex, and shared setup targets.
- `phasegate doctor --agent claude`: inspect Claude and shared targets; Codex-only findings are reported as scoped out and do not affect `overallStatus` or `exitCode`.
- `phasegate doctor --agent codex`: inspect Codex and shared targets; Claude-only findings are scoped out.

The JSON report includes the selected scope and scoped-out findings so agents can explain the distinction between "not applicable to this setup run" and a real red/manual finding. Human output includes the selected scope and a short scoped-out summary.

`setup:agent` validation guidance should point single-agent plans at the matching scoped doctor command. This keeps Claude-only setup from turning missing Codex files into an apparent Claude readiness failure while preserving full/both doctor detection.

## Affected Surfaces

- `RunDoctorDiagnosticsUseCase`: splits raw findings into applicable findings and scoped-out findings before status/exit-code calculation.
- `DoctorHandler` and CLI parsing: accepts and passes `--agent <claude|codex|both>`.
- `DiagnosticReportFormatter`: emits `scope` and `scopedOutFindings` in JSON and human output.
- `setup:agent` plan generation: recommends `phasegate doctor --agent <selected>` for single-agent setup.
- Guidance skills and troubleshooting docs: explain scoped doctor versus full doctor.
