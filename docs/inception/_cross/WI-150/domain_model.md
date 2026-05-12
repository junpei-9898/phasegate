# WI-150 Domain Model: CLI Catalog Terms

@work-item-id WI-150

## Concepts

| Concept | Meaning |
|---|---|
| Binary subcommand | A command invoked as `npx phasegate <command>`. |
| npm script | A project-local `package.json` script invoked as `npm run <script>` or `pnpm <script>`. |
| Compatibility command | A supported legacy or migration entry point whose canonical replacement is documented. |
| Internal/developer command | A command intended for PhaseGate development, dogfooding, migration, or diagnostics rather than normal onboarding. |

## Invariants

- README must not attempt exhaustive CLI enumeration.
- CLI reference must not blur binary subcommands and package scripts.
- Help-listed public commands must be represented or explicitly framed as compatibility/internal.
- Quick CI, regression-suite, skill-quality, setup lifecycle, hook, and Phase 2 commands must have a discoverable purpose statement.

