# WI-212 Unit Test Design

## Config Foundation

| Case | Expected result |
|---|---|
| Config omits `project` | Resolved config exposes `project.languages = ["typescript"]`. |
| Config omits `project.languages` | Resolved config exposes `["typescript"]`. |
| Config provides `["python", "go"]` | Resolved config preserves both values in order. |
| Config provides an empty language list | Schema or domain validation returns a configuration error. |

## Validator System

| Case | Expected result |
|---|---|
| Generic document validator with any project language | Registry classifies it as language-independent and executes it once. |
| `L3-002` with `typescript` | TypeScript performance adapter is selected. |
| `L3-002` with `python` and no adapter | Result is skipped with unsupported-language warning evidence. |
| Multi-language project with one supported and one unsupported adapter | Supported language runs; unsupported language is reported as skipped without failing the aggregate. |

## Biome AST Engine

| Case | Expected result |
|---|---|
| TypeScript source analyzer capability is queried | Adapter declares `typescript` support. |
| Non-TypeScript source path is sent to the TypeScript analyzer | Adapter refuses through registry dispatch rather than parsing the file. |

## Skill Quality

| Case | Expected result |
|---|---|
| Skill frontmatter includes `languages: [typescript]` | Applicability reports TypeScript support. |
| Skill frontmatter omits language metadata | Applicability treats the skill as generic only when the skill category is workflow/documentation. |
| Project language is unsupported by a language-scoped skill | Applicability warning names the skill and missing language support. |

## Installation

| Case | Expected result |
|---|---|
| `init --language python --yes` | Generated config contains `project.languages: ["python"]`. |
| `init --yes` without language | Generated config keeps TypeScript-compatible defaults. |

