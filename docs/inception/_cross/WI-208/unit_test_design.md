# WI-208 Unit Test Design

<!-- @work-item-id WI-208 -->

| Case ID | Target | Expectation |
|---|---|---|
| UT-WI208-001 | personal target builder | `--agent claude` includes personal sandbox config, Claude settings, skills deployment, root shim, and `.git/info/exclude`; excludes team-owned targets. |
| UT-WI208-002 | personal target builder | `--agent codex` excludes project-local `.codex/hooks.json` and emits manual external action for user-level hooks. |
| UT-WI208-003 | config resolver | root `phasegate.config.json` wins over `.phasegate-local/phasegate.config.json`. |
| UT-WI208-004 | config resolver | `.phasegate-local/phasegate.config.json` is used when root config is absent. |
| UT-WI208-005 | shim planner | existing non-managed `.claude/settings.json` becomes manual/refused without overwrite. |
| UT-WI208-006 | uninstall planner | managed personal symlink/shim entries are removed only when targets match recorded manifest hashes/targets. |
