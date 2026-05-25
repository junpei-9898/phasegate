---
traceability:
  initial_creation: true
---

# Integration Test Design: installation

> **Unit ID**: installation
> **対応 WI**: WI-145 / WI-146 / WI-147 / WI-148 / WI-182 / WI-183 / WI-207
> **作成日**: 2026-05-11
> **参照**: `logical_design.md`, `unit_test_design.md`, `docs/principles/testing-rules.md`

## 1. WI-145: Deployment manifest + silent-failure doctor

@work-item-id WI-145

### 1.1 Scope

WI-145 の integration test は、実ファイルシステム上の manifest I/O、file inspector、crypto hash、doctor CLI handler、fixture golden output を検証する。テストは temp project root 内で完結し、network access と package install は行わない。

### 1.2 Infrastructure Adapter Tests

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| IT-INS-145-INF-001 | `ManifestRepositoryPort.load` | manifest file なし | `null` |
| IT-INS-145-INF-002 | `load` | valid `.phasegate/manifest.json` | `DeploymentManifest` に復元 |
| IT-INS-145-INF-003 | `load` | 壊れた JSON | 明確な `HarnessError` |
| IT-INS-145-INF-004 | `save` | manifest 保存 | `.phasegate/manifest.json` が atomic に作成され tmp が残らない |
| IT-INS-145-INF-005 | `exists` | manifest あり / なし | boolean が正しく返る |
| IT-INS-145-INF-006 | `NodeFsFileInspectorAdapter` | text / JSON / symlink / missing file | text, object, target, `null` を contract 通り返す |
| IT-INS-145-INF-007 | `NodeCryptoHashAdapter` | 任意 content | `sha256:<64 hex>` を返す |

### 1.3 CLI / Fixture Tests

| Case ID | CLI | Fixture | 期待結果 |
|---|---|---|---|
| IT-INS-145-CLI-001 | `phasegate doctor` | `full-install` | exitCode 0、green |
| IT-INS-145-CLI-002 | `phasegate doctor` | `inert-install` | exitCode 1、silent failure を red findings として表示 |
| IT-INS-145-CLI-003 | `phasegate doctor` | `partial-install` | exitCode 1、欠落 check のみ表示 |
| IT-INS-145-CLI-004 | `phasegate doctor` | `no-phasegate` | exitCode 1、未導入状態を red findings として表示 |
| IT-INS-145-CLI-005 | `phasegate doctor --json` | `inert-install` | valid JSON、`schemaVersion="1.0"` |
| IT-INS-145-CLI-006 | `phasegate doctor --strict` | warn only project | exitCode 1 |
| IT-INS-145-CLI-007 | `phasegate doctor --report-out <path>` | `partial-install` | report file に JSON 診断結果を保存 |

| IT-INS-178-CLI-001 | `phasegate doctor --agent claude --json` | Claude-only install | exitCode 0 for agent-specific Codex omissions; JSON includes `scope.agent="claude"` and `scopedOutFindings` for Codex-only checks. |
| IT-INS-178-CLI-002 | `phasegate doctor --json` | Same Claude-only install | exitCode 1 and red Codex findings remain visible under the default full scope. |
| IT-INS-145-CLI-008 | `phasegate install/uninstall/reconcile --dry-run` | 任意 | 構造化 lifecycle report を返し、dry-run では file を変更しない |

### 1.4 Fixture Contract

| Fixture | 目的 | 最小構成 |
|---|---|---|
| `full-install` | 正常導入の false positive 防止 | package devDep、manifest、Claude/Codex hooks、husky 3 files、CI workflow、skills symlink |
| `inert-install` | skip-on-exist の silent failure 再現 | package devDep と既存 settings のみ、phasegate 配線なし |
| `partial-install` | 一部導入の検出 | Claude hook あり、Codex / husky / CI / skills の一部欠落 |
| `no-phasegate` | 未導入 PJ の診断 | 最小 package.json のみ |

### 1.5 Golden Policy

JSON は schema と主要 field を exact match し、human output は全文 snapshot ではなく重要行の包含を検証する。project root は `<PROJECT_ROOT>` に normalize する。

## 2. WI-165 lifecycle status refresh

@work-item-id WI-165

WI-146 / WI-147 / WI-148 are implemented lifecycle commands, not future-only test placeholders. Integration test design treats each command as an observable CLI flow:

| Command | IT expectation |
|---|---|
| `phasegate install --dry-run/--apply` | dry-run changes no files; apply writes managed targets, package metadata, skills links, and manifest entries. |
| `phasegate uninstall --dry-run/--apply` | dry-run reports planned reversals; apply removes/reverses managed entries and archives manifest state. |
| `phasegate reconcile --dry-run/--apply` | dry-run reports drift; apply refreshes managed targets idempotently. |
| `phasegate update-skills` | compatibility alias for reconcile path, not a separate lifecycle owner. |

`futureInstallationStrategyPorts` remains an extension point for extracting merge/reverse strategies; it is not an unimplemented runtime dependency and should not be counted as a coverage gap.

<!-- @work-item-id WI-207 -->
## 2.1 Personal Install Regression Tests

| Command / Flow | Expectation |
|---|---|
| `install --personal --apply` with existing team-owned files | Plan excludes `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, and `.gitignore`; apply leaves their bytes unchanged. |
| `install --personal --apply` | Creates `.phasegate-local/config.json`, writes only a managed block to `.git/info/exclude`, and records personal artifacts in `.phasegate/manifest.json`. |
| `uninstall --apply` after personal install | Removes `.phasegate-local/config.json`, reverses the `.git/info/exclude` block, archives the manifest, and leaves team-owned files byte-identical. |

<!-- @work-item-id WI-174 -->
## 2.2 Agent Context Managed Target Tests

| Case | Expectation |
|---|---|
| `install --apply` with missing `AGENTS.md` / `CLAUDE.md` | Creates selected agent context files and records them in `.phasegate/manifest.json`. |
| Existing `AGENTS.md` with user content | Adds or replaces only PhaseGate managed section and preserves user content. |
| `ci:auto-refresh-agent-context --apply` after install | Updates only AGENTS lesson pointer section, not the standard managed section. |
| `reconcile --apply` after template update | Refreshes only the managed section. |
| `uninstall --apply` | Removes only the managed section for merged files and preserves user content. |

<!-- @work-item-id WI-172, WI-173 -->
## 2.3 Agent Planner CLI Tests

| Command | Expectation |
|---|---|
| `setup:agent --dry-run --json` | Emits detected state, questions, changes, risks, rollback, and validation without writing files. |
| `setup:agent --apply --json` | Calls the structured install path for selected agent/Husky/CI targets and returns install result. |
| `config:plan --intent codex-hooks --json` | Emits target files, commands, risks, rollback, and validation for the chosen intent. |

<!-- @work-item-id WI-176 -->
## 2.4 Claude Code Readiness Tests

| Command | Expectation |
|---|---|
| `setup:agent --agent claude --intent strict --with-husky --dry-run --json` | `plan.agentReadiness` marks Claude planned, Codex not-applicable, and shared planned. |
| `setup:agent --agent both --intent strict --with-ci --with-husky --apply --json` followed by dry-run | Claude, Codex, and shared readiness rows are configured while external actions remain manual. |
| Registry dogfood after publish | Fresh project Claude setup creates `.claude/settings.json`, `CLAUDE.md`, `.claude/skills`, shared config, selected hooks, and validation commands pass. |

<!-- @work-item-id WI-177 -->
## 2.5 Claude Code Post-Readiness and Recovery Tests

| Command / Flow | Expectation |
|---|---|
| `setup:agent --agent both --intent strict --with-ci --with-husky --apply --json` followed by reading `CLAUDE.md` | Managed Claude context contains the post-readiness workflow from configured readiness to WI planning, product reflection, and validation. |
| `ci:auto-refresh-agent-context --apply` with existing Claude user section | User-owned Claude instructions are preserved while the managed post-readiness workflow is refreshed. |
| `setup:agent --apply --json` with `.codex` or `.claude` path conflict | Structured error distinguishes incompatible parent paths from permission denial and includes recovery guidance plus partial changes. |

<!-- @work-item-id WI-182, WI-183 -->
## 2.8 Downstream Template Contract Tests

| Command / Flow | Expectation |
|---|---|
| `install --apply` on an empty downstream project | `.husky/pre-commit` uses `npx phasegate` and does not reference `scripts/harness/main.ts`. |
| `install --apply` with CI enabled | `.github/workflows/phasegate-aidlc-gate.yml` detects npm/yarn/pnpm lockfiles and does not call nonexistent `pnpm run harness ...` scripts. |
| `ci:generate-template --type pre-commit --render` | Rendered content matches the same downstream hook contract used by install. |
| `ci:generate-template --type aidlc-gate --render` | Rendered workflow matches the same package-manager-neutral contract used by install. |

<!-- @work-item-id WI-186 -->
## 2.8.1 Installed Health/Gate Contract

| Command / Flow | Expectation |
|---|---|
| generated hooks/CI and CLI help | Blocking paths use gate commands, while `phasegate:status` remains informational with JSON health verdict. |

<!-- @work-item-id WI-179 -->
## 2.6 Scoped-Out Doctor Repair Guidance Tests

| Command / Flow | Expectation |
|---|---|
| `doctor --agent claude --json` on a Claude-only fixture | Codex-only `scopedOutFindings[]` set `repairHint` and `suggestedSkill` to `null` and explain `repairHintApplicability: "only-if-agent-selected"`. |
| Default `doctor --json` on the same fixture | Codex findings remain applicable red findings and keep existing mechanical repair hints. |
| `doctor --agent claude` human output | Scoped-out summary says the items are informational and not repair targets for the selected agent. |

<!-- @work-item-id WI-180 -->
## 2.7 Scoped-Out Doctor Effective Repair Contract Tests

| Command / Flow | Expectation |
|---|---|
| `doctor --agent claude --json` on a Claude-only fixture | Codex-only `scopedOutFindings[]` expose `currentScopeRepairTarget: false`, `repairModeApplicability: "only-if-agent-selected"`, and suppressed repair guidance. |
| Default `doctor --json` on the same fixture | Codex findings expose `currentScopeRepairTarget: true`, `repairModeApplicability: "applicable"`, and existing repair hints. |
| `doctor --agent claude` human output | Scoped-out summary lists the scoped-out check IDs and says they are not repair targets for the selected scope. |

<!-- @work-item-id WI-187 -->
## 2.9 Doctor No-op Repair Guard Tests

| Command / Flow | Expectation |
|---|---|
| `doctor --json` on a project with only `docs/inception/_shared/*_plan.md` | `wi-workflow-drift` is red/manual and has `repairHint: null`. |
| `migrate work-items --apply` on that project followed by `doctor --json` | Migration applies zero candidates and the same drift remains, so doctor must not have exposed the migration command as a repair hint. |

<!-- @work-item-id WI-198, WI-199 -->
## 2.10 Reconcile Idempotency And Protected Uninstall Tests

| Command / Flow | Expectation |
|---|---|
| `install --apply` -> `ci:auto-refresh-agent-context --apply` -> `reconcile --dry-run --json` | `CLAUDE.md`, `AGENTS.md`, and `package.json` plan items are `changed:false`. |
| `uninstall --dry-run --json` after install | `package.json` plan item includes `protected:true`. |
| manifest contains `package-lock.json` | `package-lock.json` plan item includes `protected:true`. |
| `uninstall --apply --json` without force | changed protected `package.json` mutation is listed in `refused[]` and manifest remains. |

<!-- @work-item-id WI-203 -->
## 2.11 Complete Check Wrapper Non-Target Tests

| Command / Flow | Expectation |
|---|---|
| `install --dry-run --json` in a fresh downstream project | plan entries do not include `scripts/harness/cli/complete-check.ts` and Stop hook remains configured through `npx phasegate hook stop`. |
| `reconcile --dry-run --json` in the same project | plan entries do not include `scripts/harness/cli/complete-check.ts`; no repair is proposed for the absent wrapper. |
| `doctor --json` after install | missing `scripts/harness/cli/complete-check.ts` is not reported as setup drift. |

<!-- @work-item-id WI-210 -->
## 2.12 Project Shared Skills Install Tests

| Command / Flow | Expectation |
|---|---|
| `install --agent claude --skills all --apply` | root `skills/phasegate-toolkit-guide/SKILL.md` exists and `.claude/skills/phasegate-toolkit-guide/SKILL.md` resolves. |
| `install --agent codex --skills all --apply` | root `skills/phasegate-toolkit-guide/SKILL.md` exists and `.codex/skills/phasegate-toolkit-guide/SKILL.md` resolves. |
| `install --agent both --skills core --apply` | core skill bodies exist, guidance skill bodies are absent, and both agent links point to `../skills`. |
| old install with skill links and empty root `skills/` -> `doctor --json` | selected agent skill check is red. |
| same old install -> `reconcile --apply` | shared bundled skills are deployed and doctor returns green. |
| install -> add `skills/user-owned/SKILL.md` -> uninstall | managed shared skills and links are removed while `skills/user-owned/SKILL.md` remains. |

<!-- @work-item-id WI-213 -->
## 2.13 Personal Core Defense Install Tests

| Command / Flow | Expectation |
|---|---|
| `install --personal --agent claude --apply` | Creates `.claude/CLAUDE.md`, `.claude/settings.json`, `.claude/skills`, local hooks, and local reference docs. |
| `install --personal --agent codex --apply` | Creates runtime-visible `AGENTS.md` when absent, `.codex/hooks.json`, `.codex/skills`, local hooks, and local reference docs. |
| personal install with team-owned files present | `AGENTS.md`, `CLAUDE.md`, `.husky/*`, and root `docs/principles/*` remain unchanged. |
| `install --personal --agent codex --apply` with existing non-managed `AGENTS.md` | Leaves `AGENTS.md` unchanged and reports a manual personal context readiness gap instead of creating `AGENTS.override.md`. @work-item-id WI-215 |
