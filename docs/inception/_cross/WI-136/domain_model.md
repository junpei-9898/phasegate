# WI-136 Domain Model

@work-item-id WI-136

## Model

- `StateMachineModel`: `docsStates`, `codeStates`, `transitions`, `terminalStates`, and `invalidTransitions`.
- Transition observation key: `{stateMachineId}:transition:{from}->{to}`.

## Invariants

- Docs states and code states must match.
- Terminal states must not define outgoing invalid transitions as allowed behavior.
- Each transition requires a success/failure test observation.
