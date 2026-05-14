# WI-199 Domain Model

@story-id H11-01
## Protected Uninstall Plan Item

`ProtectedUninstallPlanItem` は `UninstallPlanItem` に protected-file policy metadata を付与したもの。

| Field | Meaning |
|---|---|
| `path` | Planned target path |
| `changed` | Mutation would occur |
| `protected` | Target path matches configured protected files |
| `protectionReason` | Human-readable policy reason |
| `acknowledgementRequired` | Apply requires explicit acknowledgement |

## Protected Files

Default protected candidates include:

- `biome.json`
- `.biome.json`
- `tsconfig.json`
- `package.json`
- `package-lock.json`

Configured `protectedFiles.patterns` / `exclude` must be the source of truth when available.

## Invariants

- Dry-run JSON must expose protected mutation risk.
- Apply must not silently mutate a protected file.
- `refused` entries include enough reason for agents to report next action.
