# WI-212 Integration Test Design

## Init And Validation Flow

| Case | Expected result |
|---|---|
| Fresh project runs `phasegate init --language typescript --yes` then `phasegate validate --layer L3` | Existing TypeScript validators execute with no language-warning regression. |
| Fresh project runs `phasegate init --language python --yes` then `phasegate validate --layer L3` | TypeScript-only validators are skipped with unsupported-language warnings instead of dependency or parser failures. |
| Existing config without `project.languages` runs full validation | Behavior matches the previous TypeScript default. |

## Skill Metadata Flow

| Case | Expected result |
|---|---|
| Bundled skills are scanned after install | Language metadata is readable for language-scoped skills and generic workflow skills remain available. |
| Supported language matrix is generated or rendered | Matrix includes TypeScript-supported validators and explicit unsupported entries for other declared languages. |

