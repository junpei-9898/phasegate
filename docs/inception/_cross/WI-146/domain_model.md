---
traceability:
  initial_creation: true
work_item: WI-146
---

# Domain Model: WI-146 install structured merge

@work-item-id WI-146

## Value Objects

| Model | Responsibility |
|---|---|
| `InstallTarget` | Project-relative target path, source template path, strategy type, managed block metadata |
| `InstallPlanItem` | One target's action, repair mode, before / after hashes, and summary |
| `ManagedBlock` | Existing WI-145 marker value object reused for shell merge manifest metadata |
| `DeploymentEntry` | Existing WI-145 manifest entry reused for `created` / `merged` recording |

## Strategy Boundary

@work-item-id WI-146

`MergeStrategy<T>` remains a domain abstraction. WI-146 supplies concrete infrastructure/application strategies:

- JSON object merge preserves unknown keys and existing hook entries.
- Shell merge preserves the script body outside managed markers.
- YAML add avoids parsing unknown workflows by creating a phasegate-prefixed workflow file.
- package.json merge preserves unknown keys and existing scripts.

## Repair Decision

@work-item-id WI-146

Missing or empty/template-compatible targets are `mechanical`. Existing JSON hook files with non-phasegate custom hooks and existing Husky scripts with custom content are `ai-assisted`; `--apply` refuses those unless `--force` is present. Invalid JSON remains `manual` and is never overwritten without explicit force.
