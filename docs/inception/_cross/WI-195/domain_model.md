# WI-195 Domain Model

## Concepts

- **Public help surface**: Main and subcommand help output for invocable CLI commands.
- **Work-item migration command**: `migrate work-items`, currently a legacy inception migration surface distinct from config schema migration.

## Invariants

- If `migrate work-items` is invocable, main help advertises it.
- Doctor does not present `_shared` drift as mechanically repairable by this command.
