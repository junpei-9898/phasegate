# WI-137 Domain Model

@work-item-id WI-137

## Model

- `ErrorContract`: stable error behavior contract with `code`, `severity`, `message`, `suggestion`, `documentationRef`, `exitCode`, and optional machine fields.
- Error path observation key: `{errorContractId}:error-path`.

## Invariants

- Public errors require stable code, severity, message, concrete suggestion, and documentation reference.
- `severity=warning` aligns with exit code `0`; `severity=error` aligns with exit code `1` or `2`.
- Each error contract requires an error path test observation.
