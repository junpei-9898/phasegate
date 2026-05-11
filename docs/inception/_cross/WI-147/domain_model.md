---
traceability:
  initial_creation: true
work_item: WI-147
---

# WI-147 domain model: Manifest-driven uninstall

## Aggregate inputs

`DeploymentManifest` is the only ownership source for uninstall. `phasegate uninstall` does not infer ownership from conventional PhaseGate paths when the manifest is missing.

`UninstallPlan` is the derived set of reverse operations for the current filesystem state. It separates planning from applying so `--dry-run`, `--json`, and `--apply` share one decision model.

## Value semantics

| Concept | Meaning |
|---|---|
| `UninstallPlanItem` | One planned reverse operation for a manifest entry, including action, repair mode, reason, and optional backup path. |
| `UninstallAction` | `delete`, `unlink`, `reverse-merge`, `skip`, or `refuse`. |
| `UninstallReverseStrategy` | Structural remover for merged JSON, shell, package.json, and other managed portions. |
| `RepairMode` | `mechanical` for safe reverse operations, `ai-assisted` for user-modified managed files, `manual` for missing manifest or unsupported state. |
| `backupDir` | Force-only snapshot directory under `.phasegate/backups/uninstall-*`. |

## Invariants

- Missing manifest is manual; apply performs no automatic cleanup without ownership evidence.
- Created files are deleted only when the current hash matches the manifest, unless `--force` is used.
- Hash mismatch means user modification and is refused by normal apply.
- Force-mode deletion snapshots changed files before removal.
- Symlink entries are unlinked only when the target is the expected PhaseGate skills path.
- Merged files remove only PhaseGate-managed portions and preserve user content.
- Successful apply archives the manifest after reverse operations complete.

@work-item-id WI-147
- `RunUninstallUseCase`
- `UninstallHandler`
- `UninstallReverseStrategy`
- `DeploymentManifest`
