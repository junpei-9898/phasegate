# Logical Design: WI-012

<!-- @work-item-id WI-012 -->

## Scope

Pre-commit implementation file detection must be configurable without changing validator internals.

## Design

- Add optional `preCommit.implementationExtensions` to `phasegate.config.json`.
- Preset resolution defaults the list to `[".ts"]` when the source config omits it.
- `runPreCommit` accepts `implementationExtensions` through `PreCommitOptions`.
- CLI entrypoints load resolved config and pass the extension list into `runPreCommit`.

## Compatibility

Omitted config keeps the previous `.ts` behavior. Markdown design metadata handling remains unchanged.
