# WI-179 Integration Test Design

<!-- @work-item-id WI-179 -->

## Cases

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI179-001 | Build a Claude-only installed fixture and run `doctor --agent claude --json` | Codex-only scoped-out findings do not expose repair hints or suggested skills, and explain repair applicability. |
| IT-WI179-002 | Run default `doctor --json` on the same fixture | Codex findings remain applicable red findings with existing mechanical repair hints. |
| IT-WI179-003 | Run `doctor --agent claude` human output | The scoped-out summary says the items are informational and not repair targets for the selected agent. |
| IT-WI179-004 | Published-package dogfood | Fresh Claude-only setup confirms scoped doctor output suppresses repair guidance for unselected Codex targets. |
