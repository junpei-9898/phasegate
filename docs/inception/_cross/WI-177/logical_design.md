# WI-177 Logical Design: Claude Code Post-Readiness Workflow and Recovery Guidance

<!-- @work-item-id WI-177 -->

## Design

WI-177 extends the agent setup experience after WI-176 readiness reporting. The system keeps `setup:agent` as the local readiness detector, but managed Claude context and bundled guidance skills now explain the next work lifecycle after `claude` and `shared` readiness rows are `configured`.

The post-readiness chain is:

1. confirm or create the target WI under `docs/inception/**/{WI-XXX}/description.md`;
2. prepare or update the required inception plan/design files;
3. reflect accepted design into the relevant `docs/product/...` documents with `@work-item-id WI-XXX`;
4. run `phasegate phasegate:check-ready` or the relevant `validate --layer ...` command before commit.

Structured install/setup apply errors remain machine-readable. Recovery text must distinguish permission/sandbox denial from incompatible parent paths and managed-target refusal so Claude Code can explain whether the next action is user permission, path cleanup, or ai-assisted merge review.

## Affected Surfaces

- `docs/templates/agent-context/CLAUDE.md.template.md`: managed post-readiness workflow and structured error reading guidance.
- `skills/phasegate-toolkit-guide/SKILL.md`: read-only route for Claude readiness and next work actions.
- `skills/phasegate-config-doctor/SKILL.md`: repair route for setup errors and managed target conflicts.
- `docs/guide/troubleshooting.md`: public troubleshooting for post-readiness and representative setup errors.
- `RunInstallUseCase`: clearer `likelyCause` and `recovery` for incompatible parent path errors.
- `setup:agent` integration tests: public proof that generated Claude context and recovery JSON expose the new route.
