# WI-212 Domain Model: Language-Aware Validation

## Scope

PhaseGate validation remains language-independent at the workflow level, but source analyzers, coverage runners, mock detectors, init defaults, and shipped skills must declare the programming languages they support. WI-212 introduces language-aware capability metadata and adapter dispatch without requiring Python, Go, or Rust analyzers to be implemented in the same change.

## Concepts

| Concept | Definition |
|---|---|
| Project language set | The declared languages for a consumer project, resolved from `phasegate.config.json` with `["typescript"]` as the backward-compatible default. |
| Language capability | A validator, analyzer, runner, or skill declaration that names the languages it can handle. |
| Language adapter | A concrete implementation for one language family, selected by validator id and project language. |
| Unsupported language skip | A non-failing validation result that explains that a validator has no adapter for the declared language. |
| Skill language metadata | Frontmatter on bundled skills that identifies the language scope the skill applies to. |
| Supported language matrix | Public documentation that maps validators and skills to supported languages and current limitations. |

## Invariants

- Omitted language config resolves to `["typescript"]` so existing TypeScript projects keep their current validator behavior.
- A language-specific validator must not fail a project solely because another declared language lacks an adapter; unsupported combinations produce skip + warning evidence.
- Validator policy stays in validator-system. Language adapters provide source facts, coverage facts, or framework facts.
- `phasegate init --language <lang>` writes language declarations and selects compatible defaults, but it does not imply that all validators support that language.
- Shipped skill language metadata is descriptive and filterable; it must not hide generic PhaseGate workflow skills from all projects.

## Unit Ownership

| Unit | Ownership |
|---|---|
| config-foundation | Config schema, resolved default language set, and projection to validator consumers. |
| validator-system | Validator id x language adapter dispatch and unsupported-language skip semantics. |
| biome-ast-engine | TypeScript source analyzer adapter capability declaration and source-fact boundary. |
| skill-quality | Skill frontmatter language metadata and applicability checks. |
| installation | `init --language` bootstrap and generated template defaults. |

