# WI-119 Logical Design

<!-- @work-item-id WI-119 -->

L4-003 dead-code detection uses a source-analysis port that returns a normalized import/export graph. The infrastructure adapter owns TypeScript parsing and resolver details; the domain service only consumes `unusedExports`, `unreachableCode`, and explanatory metadata.

## Design

- Build graph nodes from TypeScript source files with exported symbols.
- Build edges from static import, re-export, `export * from`, and dynamic `import()` references.
- Treat CLI entrypoints, package public API files, tests, fixtures, and generated/template files as excluded boundaries.
- Mark an exported symbol used when it is imported by name, namespace, default import, or through a barrel re-export.
- Report unused exports with file path, symbol name, reason, and exclusion context.

## Operating Mode

L4-003 remains scheduled advisory by default. `validate --layer L4 --fail-on-warning` is the explicit path for turning warning findings into a gate failure.
