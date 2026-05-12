# WI-149 Domain Model: Public Contract Terms

@work-item-id WI-149

## Concepts

| Concept | Meaning |
|---|---|
| Design docs root | The configured construction document root used by phase-gate artifact resolution. |
| Public command name | A command users can invoke through `npx phasegate <command>` or a documented package script. |
| Package script | A `package.json` script entry; it is not implied by a binary subcommand name. |
| HarnessError recovery metadata | Optional agent-readable fields that supplement `suggestion` and `fix_example`. |
| Pre-commit metadata validation | The staged-file metadata checks executed by `phasegate pre-commit`, including Markdown WI/product metadata. |

## Invariants

- Public docs must not describe a non-existent package script as runnable via `npm run` or `pnpm`.
- Product docs must list all HarnessError public fields that implementation can emit.
- `paths.designDocs` examples must resolve to `{designDocsRoot}/{unit}/...` construction artifacts.
- Hook documentation must identify `phasegate pre-commit` as the public staged metadata validation entry point.

