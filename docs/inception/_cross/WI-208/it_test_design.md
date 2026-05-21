# WI-208 Integration Test Design

<!-- @work-item-id WI-208 -->

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI208-INS-001 | `phasegate install --personal --agent claude --apply` in a team repository | Team-owned files remain byte-identical. |
| IT-WI208-INS-002 | Same flow | `.phasegate-local/phasegate.config.json`, `.phasegate-local/claude/settings.json`, `.phasegate-local/skills`, `.claude/settings.json` shim, and `.claude/skills` shim exist. |
| IT-WI208-INS-003 | Same flow | `.git/info/exclude` contains a managed block that hides `.phasegate-local/`, `.phasegate/`, `.claude/`, `.codex/`, `skills/`, and root `phasegate.config.json`. |
| IT-WI208-INS-004 | Existing non-PhaseGate `.claude/settings.json` | Apply refuses or reports manual review without overwriting existing content. |
| IT-WI208-CFG-001 | Run `phasegate validate --layer L2` with no root `phasegate.config.json` but with `.phasegate-local/phasegate.config.json` | Command resolves personal config fallback and reports the source. |
| IT-WI208-UNINS-001 | `phasegate uninstall --apply` after personal Claude install | Personal sandbox and root shim are removed; team-owned files remain byte-identical. |
| IT-WI208-UNINS-002 | Same uninstall flow | `.git/info/exclude` keeps user lines and removes only the PhaseGate managed block. |
