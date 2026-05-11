---
traceability:
  initial_creation: true
work_item: WI-145
---

# WI-145 domain model: Manifest and doctor foundation

## Aggregate roots

`DeploymentManifest` records the PhaseGate-owned deployment state for a project. It is the source of truth for later install, uninstall, reconcile, and doctor flows; filesystem paths alone are not ownership evidence.

`DiagnosticReport` records the current health findings for an installed or partially installed project. It is transient and derived from heuristic checks plus manifest evidence.

## Value semantics

| Concept | Meaning |
|---|---|
| `DeploymentEntry` | One managed path, including mode, optional managed block, content hash, and deployment time. |
| `Hash` | `sha256:<64 hex chars>` content identity used to detect user modification. |
| `ManagedBlock` | Identifier for a PhaseGate-owned portion inside a merged file. |
| `DiagnosticFinding` | One doctor finding with check id, severity, target, repair mode, and optional skill hint. |
| `RepairMode` | `mechanical`, `ai-assisted`, or `manual`, chosen from the observed file state. |
| `SuggestedSkill` | Optional AI-assist hint for cases where structural repair may require judgment. |

## Invariants

- Manifest entry paths are unique.
- `merged` entries must carry a managed block identifier.
- `created` and `symlink` entries do not carry a managed block.
- Hashes always use the `sha256:` prefix form.
- Doctor findings are unique by check id.
- `ai-assisted` findings carry a suggested skill when the repair table has one.
- A red finding makes the report status red; warning-only findings make it warn.
- Manifest writes are atomic and leave either the previous manifest or the complete new manifest on disk.

## Ports

`ManifestRepositoryPort` loads, saves, checks, and later archives `.phasegate/manifest.json`.

`FileInspectorPort` gives doctor checks safe read access to text, JSON, existence, and symlink state without throwing parse errors into the use case.

`HashCalculatorPort` centralizes content hashing so manifest, uninstall, and reconcile compare hashes consistently.

@work-item-id WI-145
- `DeploymentManifest`
- `DeploymentEntry`
- `DiagnosticReport`
- `DiagnosticFinding`
- `RepairMode`
- `SuggestedSkill`
- `ManifestRepositoryPort`
