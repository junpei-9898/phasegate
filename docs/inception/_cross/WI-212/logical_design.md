# WI-212 Logical Design: Language-Aware Validator And Skill Dispatch

## Approach

Introduce a small language capability model at the existing seams instead of rewriting validators:

1. `config-foundation` resolves `project.languages` to a non-empty language list. Missing config means `["typescript"]`.
2. `validator-system` receives the resolved language list and asks a validator-language registry for an adapter by `validatorId` and language.
3. TypeScript-backed validators keep their current adapters registered for `typescript`.
4. Unsupported validator/language combinations return skipped validation results with a warning message and machine-readable reason.
5. `skill-quality` reads bundled skill frontmatter language metadata and exposes applicability without changing skill execution semantics.
6. `installation` adds `init --language <lang>` as bootstrap sugar for generated config and skill defaults.

## Adapter Dispatch

`ValidatorLanguageRegistry` is the new validator-system boundary. The registry maps:

| Key | Value |
|---|---|
| `validatorId` | Existing stable validator id such as `L3-002`, `L3-003`, `L4-003`. |
| `language` | Resolved project language such as `typescript`, `python`, `go`, or `rust`. |
| `capability` | `supported`, `unsupported`, or `generic`. |
| `adapter` | Existing analyzer/runner implementation when supported. |

Generic Markdown/document validators are registered as language-independent. TypeScript source validators are registered only for `typescript` until later language adapters are added.

## Config Design

`phasegate.config.json` gains:

```json
{
  "project": {
    "languages": ["typescript"]
  }
}
```

The resolved config object must preserve backward compatibility:

- absent `project` means default `project.languages = ["typescript"]`;
- absent `project.languages` means default `["typescript"]`;
- empty arrays are invalid;
- unknown language strings are accepted only if the registry can classify them as unsupported with a warning, not as schema corruption.

## CLI Bootstrap

`phasegate init --language <lang>` writes the selected language into generated config and selects language-scoped skill metadata where available. The first implementation supports bootstrap declaration and TypeScript defaults; non-TypeScript languages may initialize successfully but should show clear unsupported-validator warnings.

## Documentation

Add a supported language matrix to the user guide. The matrix distinguishes workflow/document validators, TypeScript-only source validators, coverage/test-framework validators that currently depend on Vitest, and planned adapter slots for Python/Go/Rust.

## Compatibility

Existing TypeScript users should see no behavior change when config omits language fields. Existing validator ids and result shapes stay stable; language metadata is additive.

