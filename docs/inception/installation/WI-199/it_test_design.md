# WI-199 IT Test Design

@story-id H11-01
## Cases

| ID | Scenario | Setup | Expected |
|---|---|---|---|
| IT-WI199-001 | dry-run marks protected package.json | installed temp project | `plan[]` entry for `package.json` includes `protected:true` or equivalent marker. |
| IT-WI199-002 | apply refuses protected mutation by default | installed temp project | `uninstall --apply --json` exits non-zero or reports refused protected package.json without changing it. |
| IT-WI199-003 | protected warning in human output | installed temp project | human dry-run lists protected files planned for mutation. |
| IT-WI199-004 | non-protected managed files still uninstall | installed temp project with hooks/workflow | hook and workflow lifecycle behavior remains unchanged. |

## Regression Guard

Extend installation uninstall handler tests around manifest-driven uninstall so package-json strategy cannot regress to unmarked protected mutation.
