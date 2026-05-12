# WI-121 Logical Design

<!-- @work-item-id WI-121 -->

L3-002 performance validation is a practical signal, not a profiler. It detects cheap static smells that are useful in CI: oversized files, await in loops, synchronous filesystem calls, and large inline JSON/object literals.

## Scope

- In scope: file size threshold, await-in-loop, synchronous I/O, large object/array literals.
- Out of scope: runtime hot path measurement, database query planning, bundle graph optimization.
- Suppression: `phasegate-ignore-performance` on the same line or nearby file context for accepted migration/batch scripts.

## Operating Mode

Standard projects can run L3-002 as warning signal. Strict/custom presets may convert the warning to a gate through existing validator severity handling.
