---
id: WI-117
type: issue
status: drafted
---

# WI-117 Domain Model

## DriftElementRecord

`DriftElementRecord` is the unit-scoped drift comparison atom.

- `unitName`: owner Unit resolved from `@unit` metadata first, path convention second.
- `element`: public design/code element name.
- `pointers`: design-side explicit implementation pointers.
- `filePaths`: code-side defining source files.

## Drift Key

Drift matching uses `unitName + element`. Element-name-only matching is invalid because two Units may expose the same public name.

## Pointer Match Policy

Design pointers can satisfy the design side when they resolve to a code file in the same Unit. They do not automatically satisfy every export in that file. A renamed single-export file can be matched, but additional unrelated exports remain `code→design` drift.
