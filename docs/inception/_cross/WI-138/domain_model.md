# WI-138 Domain Model

@work-item-id WI-138

## Model

- `TraceabilityGraphSlice`: WI, affected units, product reflection units, implementation WI ids, test WI ids, and public-doc/contract change flags.

## Invariants

- Each affected unit requires product reflection.
- Implementation evidence for a WI requires matching test observation for the same WI.
- Public docs and contract changes must be synchronized or justified.
