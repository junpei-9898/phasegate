# Installation

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** 9+ or **pnpm**
- **TypeScript** 5.x (included as a devDependency)

## Install from npm

```bash
npm install --save-dev phasegate
```

Or add it directly to your `package.json`:

```json
{
  "devDependencies": {
    "phasegate": "^0.152.9"
  }
}
```

Then run:

```bash
npm install
```

## Project Setup

### New Projects

```bash
npx phasegate init --name <project-name>
```

This deploys 29 skills to `skills/`, creates the agent-facing skill links (for example `.claude/skills/` or `.codex/skills/`), and generates `phasegate.config.json`.

`init` is the legacy-compatible bootstrap path for new projects. It also runs the structured install path for the selected agent target so `CLAUDE.md` and/or `AGENTS.md` receive a PhaseGate managed section. Use `install` when the project may already have hooks, package scripts, or CI files that should be preserved. <!-- @work-item-id WI-174 -->

For Codex, project initialization stops at the project boundary. After `npx phasegate init --agent codex`, enable the Codex CLI feature flag manually:

```bash
codex features enable hooks
```

### Existing Projects

Use `install` when the project already has package scripts, hooks, or CI files that should be preserved.

```bash
npx phasegate install --dry-run
npx phasegate install --apply
npx phasegate doctor
```

`install --dry-run` reports whether each target will be created, merged, skipped, or refused. `install --apply` performs the merge, adds package scripts and the `phasegate` devDependency, deploys selected bundled skills to root `skills/`, creates `.claude/skills` and `.codex/skills` links, writes `CLAUDE.md` / `AGENTS.md` managed sections for selected agent targets, writes `.github/workflows/phasegate-aidlc-gate.yml` when CI is enabled, and records managed entries in `.phasegate/manifest.json`. Existing skills catalogs are merged: PhaseGate refreshes only bundled skill directories selected by `--skills core|all` and preserves user-owned skills. See [Setup Artifacts](setup-artifacts.md) for the full managed target, generated artifact, runtime state, legacy artifact, and user-level setting inventory. <!-- @work-item-id WI-152 --> <!-- @work-item-id WI-169 --> <!-- @work-item-id WI-174 --> <!-- @work-item-id WI-216 -->

For personal evaluation inside a team-owned repository:

```bash
npx phasegate install --personal --agent claude --dry-run
npx phasegate install --personal --agent claude --apply
```

Personal install keeps team-owned files out of the apply path: `package.json`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, `.gitignore`, GitHub CLI config, repo secrets, and CI settings are not touched. PhaseGate writes `.phasegate-local/phasegate.config.json`, creates runtime-visible local agent context (`.claude/CLAUDE.md` for Claude, and `AGENTS.md` for Codex only when that root file is absent or already PhaseGate-managed), creates real local-only agent runtime artifacts for the selected agent (`.claude/settings.json` + `.claude/skills/` and/or `.codex/hooks.json` + `.codex/skills/`), deploys local git hooks under `.git/hooks/`, copies reference docs under `.phasegate-local/docs/`, records `.phasegate/manifest.json`, and manages a local exclude block in `.git/info/exclude`. Existing personal skills directories are merged the same way as project `skills/`: bundled PhaseGate skills are added or refreshed, user-owned skills are preserved, and legacy `.harness-version` catalogs can be adopted into the manifest. If a team `AGENTS.md` already exists, personal Codex install leaves it unchanged and `doctor --personal --agent codex` reports the remaining context step instead of hiding it behind `AGENTS.override.md`. Codex user-level hook feature enablement is still reported as a manual action. <!-- @work-item-id WI-207 --> <!-- @work-item-id WI-208 --> <!-- @work-item-id WI-209 --> <!-- @work-item-id WI-213 --> <!-- @work-item-id WI-215 --> <!-- @work-item-id WI-216 -->

If an existing repository keeps design or governance docs outside `docs/`, set `paths.designDocs`, `paths.inceptionDocs`, `paths.principlesDocs`, and `paths.folderRulesDoc` in `phasegate.config.json` before setup/reconcile. PhaseGate deploy and hook protection use those mappings instead of forcing the default `docs/` layout. <!-- @work-item-id WI-214 -->

For agent-readable planning before writing files:

```bash
npx phasegate setup:agent --intent recommended --dry-run --json
npx phasegate setup:agent --intent strict --with-ci --with-husky --dry-run --json
```

The setup plan includes detected state, questions, planned changes, risks, rollback, and validation commands. <!-- @work-item-id WI-172 -->

If a managed update must replace existing custom content, use:

```bash
npx phasegate install --apply --force
```

Forced updates write backups under `.phasegate/backups/<timestamp>/` before applying changes.

To remove PhaseGate-managed files later, preview and apply uninstall:

```bash
npx phasegate uninstall --dry-run
npx phasegate uninstall --apply
```

`uninstall` reads `.phasegate/manifest.json`, deletes files that PhaseGate created, removes only PhaseGate-managed portions from merged JSON, markdown agent context files, Husky, and `package.json` files, removes manifest-managed bundled skills, and archives the manifest as `.phasegate/uninstalled-<timestamp>.json`. User-owned skill directories remain in place, and skills parent directories are kept when they still contain user-owned skills. If a managed file was modified after install, `uninstall --apply` refuses that entry until you rerun with `--force`, which creates a backup under `.phasegate/backups/uninstall-<timestamp>/`. <!-- @work-item-id WI-174 --> <!-- @work-item-id WI-216 -->

After upgrading PhaseGate, reconcile existing managed files with the bundled templates from the new version:

```bash
npx phasegate reconcile --dry-run
npx phasegate reconcile --apply
```

`reconcile` updates PhaseGate-managed portions, preserves user content, adds newly introduced managed targets, repairs missing or stale bundled skills in project and personal catalogs, and refreshes `.phasegate/manifest.json` with current version/hash metadata. If a managed file was edited after install, `reconcile --apply` refuses that entry until you rerun with `--force`, which creates a backup under `.phasegate/backups/reconcile-<timestamp>/`. <!-- @work-item-id WI-216 -->

### Manual Setup Pieces

If you do not use `init` or `install`, copy the design principle documents manually:

```bash
cp node_modules/phasegate/docs/folder_management_rules.md docs/
mkdir -p docs/principles
cp node_modules/phasegate/docs/principles/*.md docs/principles/
```

### Create product overview

Create `docs/product/<your_product>_overview.md` as the starting point for AIDLC.

### Start Claude Code

```bash
claude  # at project root
```

Run `/product-architect` to begin the AIDLC process.

## Updating

```bash
npm update phasegate
npx phasegate reconcile --dry-run
npx phasegate reconcile --apply
```

`phasegate update-skills` remains available as a compatibility alias. It now follows the same manifest-aware reconcile path, including project and personal bundled skill repair, so `reconcile` remains the preferred explicit upgrade command. <!-- @work-item-id WI-216 -->

`doctor --report-out <path>` writes exactly to the provided path. `.phasegate/last-doctor-report.json` is not a fixed output file unless you choose that path explicitly. <!-- @work-item-id WI-152 -->

## Recommended .gitignore additions

```
node_modules/
skills/            # regenerated by npx phasegate init
.claude/skills/    # symlink to ../skills when Claude is enabled
.codex/skills/     # symlink to ../skills when Codex is enabled
dist/
reports/
.harness/
```

## Verify Installation

```bash
npx phasegate --version
npx phasegate lint
npx phasegate doctor
npm run phasegate:check-ready
```
