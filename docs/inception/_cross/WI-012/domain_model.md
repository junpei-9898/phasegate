# Domain Model: WI-012

<!-- @work-item-id WI-012 -->

| Concept | Kind | Responsibility |
|---|---|---|
| `preCommit.implementationExtensions` | Config field | Lists file extensions treated as implementation files by the pre-commit entrypoint. |
| `runPreCommit` | Presentation service | Splits staged files into implementation files, metadata markdown files, and test metadata files. |

## Invariants

- The extension list is non-empty when configured.
- Extensions are normalized to include a leading dot.
- The default extension list is `[".ts"]`.
