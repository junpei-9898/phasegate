---
traceability:
  initial_creation: true
---

# WI-175 Domain Model

<!-- @work-item-id WI-175 -->

## Value Objects

### `SetupCompletenessEntry`

Represents one area in the setup confidence summary.

```typescript
type SetupCompletenessStatus = "configured" | "planned" | "manual" | "not-applicable" | "unknown";

interface SetupCompletenessEntry {
  readonly area: string;
  readonly status: SetupCompletenessStatus;
  readonly evidence: readonly string[];
  readonly nextAction: string | null;
  readonly risk: string | null;
}
```

Invariants:

- `area` is stable and kebab-case.
- `manual` entries must include a `nextAction`.
- `configured` entries must include evidence.

### `ConfigPatchPreview`

Read-only representation of local `phasegate.config.json` changes.

```typescript
interface ConfigPatchPreview {
  readonly path: "phasegate.config.json";
  readonly applicability: "applicable" | "not-applicable" | "blocked";
  readonly blockedReason: string | null;
  readonly before: unknown;
  readonly after: unknown;
  readonly operations: readonly ConfigPatchOperation[];
}
```

### `ConfigPatchOperation`

```typescript
interface ConfigPatchOperation {
  readonly op: "add" | "replace";
  readonly pointer: string;
  readonly before: unknown;
  readonly after: unknown;
}
```

### `ExternalAction`

Represents a task PhaseGate can recommend but cannot locally prove.

```typescript
interface ExternalAction {
  readonly id: string;
  readonly label: string;
  readonly command: string | null;
  readonly blocking: boolean;
}
```

### `TargetAwareApplyError`

Structured error for filesystem write failures during install/setup apply.

```typescript
interface TargetAwareApplyError {
  readonly target: string;
  readonly operation: string;
  readonly code: string;
  readonly likelyCause: string;
  readonly recovery: string;
  readonly partialChanges: readonly string[];
}
```

## Aggregate Rules

- `AgentSetupPlan` owns completeness because it is the first-run decision surface.
- `ConfigChangePlan` owns config patch preview because config-foundation owns the meaning of config changes.
- `RunInstallResult` may return `error` instead of throwing for anticipated filesystem failures so CLI JSON remains machine-readable.
