# WI-180 Integration Test Design

<!-- @work-item-id WI-180 -->

## Cases

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI180-001 | Build a Claude-only fixture and run `doctor --agent claude --json` | Codex-only `scopedOutFindings[]` set `currentScopeRepairTarget: false` and mark repair mode / hint applicability as only-if-agent-selected. |
| IT-WI180-002 | Run default `doctor --json` on the same fixture | Codex findings remain applicable red findings with `currentScopeRepairTarget: true` and applicable repair fields. |
| IT-WI180-003 | Run `doctor --agent claude` human output | Scoped-out summary lists `codex-hook-missing` and `codex-skills-symlink` while stating they are not repair targets. |
| IT-WI180-004 | Published-package dogfood | Fresh Claude-only setup confirms scoped doctor JSON and human output expose the effective repair contract. |
