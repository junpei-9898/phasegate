# AGENTS.md

<!-- @work-item-id WI-174 -->

<!-- phasegate:managed-section:start -->
## PhaseGate Managed Instructions

### Required Documents

- `docs/folder_management_rules.md`
- `docs/principles/architecture-philosophy.md`
- `docs/principles/testing-rules.md`

### Workflow

- Create or update the relevant `docs/inception/**/WI-XXX/` work item before planning, design, implementation, or tests.
- Reflect accepted design into `docs/product/...` with `@work-item-id WI-XXX` before changing source files.
- Run the relevant PhaseGate checks after changing docs, source, hooks, skills, or setup artifacts.
- Do not bypass git hooks unless the user explicitly approves the reason, residual risk, and replacement validation.

### Setup State

- Agent target: `{{PHASEGATE_AGENT}}`
- Skill set: `{{PHASEGATE_SKILLS_MODE}}`
- Workflow mode: `{{PHASEGATE_WORKFLOW}}`
- Husky hooks: `{{PHASEGATE_HUSKY_STATE}}`
- CI workflow: `{{PHASEGATE_CI_STATE}}`

### Common Commands

{{PHASEGATE_COMMANDS}}

### Codex Notes

- Enable native hook execution with `codex features enable hooks` when Codex hooks are installed.
- Keep local-only Codex settings outside repository-managed targets unless PhaseGate explicitly reports them as managed.
<!-- phasegate:managed-section:end -->

<!-- phasegate:lesson-pointers:start -->
<!-- lesson pointers are managed by phasegate ci:auto-refresh-agent-context -->
<!-- phasegate:lesson-pointers:end -->

<!-- phasegate:user-section:start -->
Project-specific agent instructions go here.
<!-- phasegate:user-section:end -->
