# WI-150 Logical Design: Public CLI Catalog Consolidation

@work-item-id WI-150

## Change Strategy

Keep README as a short entry-point list and move the full command catalog to `docs/guide/cli-reference.md`. The CLI reference distinguishes binary subcommands, npm scripts, compatibility commands, and internal/developer commands.

## Catalog Rules

- Commands shown by `phasegate --help` must either appear in CLI reference or be classified by purpose.
- `phasegate:*` commands are binary subcommands first. They are npm scripts only when `package.json` defines matching scripts.
- Setup lifecycle commands must list `--json` variants where public help exposes them.
- Regression-suite, skill-quality, quick CI, hook, and Phase 2 compatibility commands must be discoverable from the CLI reference.

## Touched Surfaces

- `README.md`
- `DEVELOPMENT.md`
- `docs/guide/cli-reference.md`

