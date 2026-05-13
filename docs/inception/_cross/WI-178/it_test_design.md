# WI-178 Integration Test Design

<!-- @work-item-id WI-178 -->

## Cases

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI178-001 | Build a Claude-only installed fixture and run `doctor --agent claude --json` | Codex hook and skill findings are scoped out and exit code is not red because of Codex. |
| IT-WI178-002 | Run default `doctor --json` on the same fixture | Codex hook and skill findings remain red, preserving full-scope diagnostics. |
| IT-WI178-003 | `setup:agent --agent claude --dry-run --json` | Validation guidance contains `phasegate doctor --agent claude` instead of the full-scope `phasegate doctor`. |
| IT-WI178-004 | Published-package dogfood | Fresh Claude-only setup confirms scoped doctor/guidance does not suggest repairing unselected Codex targets. |
