# WI-209 Unit Test Design

<!-- @work-item-id WI-209 -->

| Case ID | Target | Expectation |
|---|---|---|
| UT-WI209-001 | Personal Claude install planner | Plans `.claude/settings.json` as a real copied file and `.claude/skills` as a real copied directory. |
| UT-WI209-002 | Personal Codex install planner | Plans `.codex/hooks.json` as a real copied file and `.codex/skills` as a real copied directory. |
| UT-WI209-003 | Existing non-managed agent files | Existing `.claude/*` / `.codex/*` paths are refused or marked manual without overwrite. |
| UT-WI209-004 | Doctor checks | Real `.claude/skills` / `.codex/skills` directories are valid. |
| UT-WI209-005 | Uninstall planner | Managed real runtime files/directories are deleted only when recorded by manifest. |
