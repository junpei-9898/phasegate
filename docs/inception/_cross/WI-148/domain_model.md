---
traceability:
  initial_creation: true
work_item: WI-148
---

# WI-148 domain model: Reconcile

## Aggregate inputs

`DeploymentManifest` is the source of truth for previously managed files. `Reconcile` does not infer ownership from filesystem paths alone; it compares each `DeploymentEntry.hash` with the current file hash to distinguish unmodified managed content from user-modified content.

## Value semantics

| Concept | Meaning |
|---|---|
| `ReconcilePlanItem` | One planned action for a managed path. Includes action, strategy, `RepairMode`, diff summary, and optional skill hint. |
| `ReconcileAction` | `missing-manifest`, `update`, `add`, `link`, `skip`, or `refuse`. |
| `RepairMode` | `mechanical` when hash matches or target is safely addable, `ai-assisted` when user modification conflicts with template update, `manual` for missing manifest or unsupported template. |
| `backupDir` | Force-only snapshot directory under `.phasegate/backups/reconcile-*`. |

## Invariants

- Manifest missing is manual; reconcile never writes without manifest ownership evidence.
- Hash mismatch means user modification. `--apply` refuses it unless `--force` is present.
- `--force` always backs up existing changed files before overwrite.
- Created entries are reconciled as whole-file templates when their hash matches the manifest.
- Merged entries update only PhaseGate-managed portions and preserve user content.
- Symlink entries are reconciled only when the desired target is `../skills`.
- Apply writes the current package version and refreshed hashes back to `.phasegate/manifest.json`.

@work-item-id WI-148
- `RunReconcileUseCase`
- `ReconcileHandler`
- `DeploymentManifest`
