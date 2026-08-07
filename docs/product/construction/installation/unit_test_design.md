---
traceability:
  initial_creation: true
---

# Unit Test Design: installation

> **Unit ID**: installation
> **対応 WI**: WI-145 / WI-146 / WI-147 / WI-148
> **作成日**: 2026-05-11
> **参照**: `domain_model.md`, `logical_design.md`, `docs/principles/testing-rules.md`

## 1. WI-145: Deployment manifest + silent-failure doctor

@work-item-id WI-145

### 1.1 Scope

WI-145 / WI-169 の unit test は、manifest / doctor の domain invariant、10 種 heuristic check、doctor report formatting を検証する。IO は Port mock に限定し、domain object は実体を使う。

### 1.2 Domain Test Cases

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| UT-INS-145-DM-001 | `DeploymentEntry` | created / merged / symlink の有効 input | immutable な VO として生成される |
| UT-INS-145-DM-002 | `DeploymentEntry` | merged entry に block がない | invariant violation |
| UT-INS-145-DM-003 | `Hash` | `sha256:<64 hex>` | 正常生成 |
| UT-INS-145-DM-004 | `Hash` | prefix 欠落、長さ不正、hex 不正 | error contract |
| UT-INS-145-DM-005 | `DeploymentManifest` | semver version と unique paths | 正常生成 |
| UT-INS-145-DM-006 | `DeploymentManifest` | path 重複 | duplicate path error |
| UT-INS-145-DM-007 | `DeploymentManifest.addEntry/removeEntry` | entry 追加・差し替え・削除 | pure function として新 instance を返す |
| UT-INS-145-DM-008 | `DiagnosticFinding` | ai-assisted だが suggestedSkill なし | invariant violation |
| UT-INS-145-DM-009 | `DiagnosticReport` | findings なし / warn のみ / red あり | green / warn / red を derive |
| UT-INS-145-DM-010 | `RepairTable` | 9 CheckId を lookup | 全件が期待 mapping を返す |

### 1.3 HeuristicCheck Test Cases

| Case ID | Check | pass 条件 | failure 観点 |
|---|---|---|---|
| UT-INS-145-HC-001 | `ClaudeHookMissingCheck` | `.claude/settings.json` に phasegate hook あり | missing / custom settings / malformed JSON |
| UT-INS-145-HC-002 | `CodexHookMissingCheck` | `.codex/hooks.json` に phasegate hook あり | missing / empty hooks / malformed JSON |
| UT-INS-145-HC-003 | `HuskyPreCommitMissingCheck` | managed block と `phasegate lint` あり | missing / custom script without phasegate |
| UT-INS-145-HC-004 | `HuskyCommitMsgMissingCheck` | `phasegate commit-msg` あり | missing / custom script without phasegate |
| UT-INS-145-HC-005 | `HuskyPrePushMissingCheck` | `phasegate bypass:audit` あり | missing は warn + mechanical |
| UT-INS-145-HC-006 | `CiWorkflowMissingCheck` | phasegate workflow file あり | workflow missing は warn + manual |
| UT-INS-145-HC-007 | `PackageJsonDevdepMissingCheck` | `devDependencies.phasegate` あり | package missing / devDep missing |
| UT-INS-145-HC-008 | `ClaudeSkillsSymlinkCheck` | `.claude/skills` symlink target が project `skills` | missing / wrong target |
| UT-INS-145-HC-009 | `CodexSkillsSymlinkCheck` | `.codex/skills` symlink target が project `skills` | missing / wrong target |
| UT-INS-169-HC-010 | `WiWorkflowDriftCheck` | WI frontmatter drift | no drift / warn drift |

### 1.4 UseCase / Formatter Test Cases

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| UT-INS-145-UC-001 | `RunDoctorDiagnosticsUseCase` | 全 checks pass | green report |
| UT-INS-145-UC-002 | `RunDoctorDiagnosticsUseCase` | red / warn findings 混在 | red report、findings checkId 一意 |
| UT-INS-145-UC-003 | `RunDoctorDiagnosticsUseCase` | warn only + strict false | exit decision 0 |
| UT-INS-145-UC-004 | `RunDoctorDiagnosticsUseCase` | warn only + strict true | exit decision 1 |
| UT-INS-145-UC-005 | `DiagnosticReportFormatter` | human output | checkId / target / repairMode / hint を含む |
| UT-INS-145-UC-006 | `DiagnosticReportFormatter` | json output | `schemaVersion="1.0"` の stable JSON |

### 1.4.1 WI-180 Formatter Contract Cases

<!-- @work-item-id WI-180 -->

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| UT-INS-180-UC-001 | `DiagnosticReportFormatter` | applicable finding | `currentScopeRepairTarget: true` と applicable repair applicability fields を出力する |
| UT-INS-180-UC-002 | `DiagnosticReportFormatter` | scoped-out finding | `currentScopeRepairTarget: false` と only-if-selected repair applicability fields を出力する |
| UT-INS-180-UC-003 | `DiagnosticReportFormatter` | scoped-out human output | checkId 一覧と not repair target wording を出力する |

### 1.5 Placement

| 種別 | 配置 |
|---|---|
| Domain | `scripts/harness/__tests__/unit/installation/*.test.ts` |
| Checks | `scripts/harness/__tests__/unit/installation/checks/*.test.ts` |
| UseCase / Formatter | `scripts/harness/__tests__/unit/installation/*.test.ts` |

<!-- @work-item-id WI-203 -->
## 1.6 Complete Check Wrapper Non-Target Cases

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| UT-INS-WI203-001 | install target planning | standard setup | `scripts/harness/cli/complete-check.ts` is not emitted as a managed target |
| UT-INS-WI203-002 | reconcile target planning | standard setup | missing `scripts/harness/cli/complete-check.ts` does not become a repair plan item |
| UT-INS-WI203-003 | doctor checks | standard setup without wrapper | missing wrapper is not a diagnostic finding |

<!-- @work-item-id WI-210 -->
## 1.7 Project Shared Skills Cases

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| UT-INS-WI210-001 | skills doctor check | symlink points to `../skills` but target is empty | red mechanical finding |
| UT-INS-WI210-002 | skills doctor check | symlink target contains `.harness-version` or `SKILL.md` | no finding |
| UT-INS-WI210-003 | uninstall planning | manifest has per-skill entries and user-owned `skills/user-owned` exists | managed skill entries are deleted, user-owned skill remains |

<!-- @work-item-id WI-213 -->
## 1.8 Personal Core Defense Cases

| Case ID | Target | Preconditions | Expected result |
|---|---|---|---|
| UT-INS-WI213-001 | personal install planning | `--personal --agent claude` | plan includes `.claude/CLAUDE.md`, `.git/hooks/pre-commit`, `.git/hooks/commit-msg`, and `.phasegate-local/docs/*` |
| UT-INS-WI213-002 | personal config template | default personal config | design/inception paths are under `.phasegate-local/` |

<!-- @work-item-id WI-216 -->
## 1.9 Managed Skills Merge Cases

| Case ID | Target | Preconditions | Expected result |
|---|---|---|---|
| UT-INS-WI216-001 | personal skills planning | `.claude/skills/.harness-version` exists but a selected bundled skill is missing | plan is changed and mechanical |
| UT-INS-WI216-002 | skills doctor check | skills target contains only `.harness-version` | red mechanical finding |
| UT-INS-WI216-003 | uninstall planning | legacy `.codex/skills` parent entry and user-owned skill exist | known bundled skill directories are removed and user-owned skill remains |
## WI-214 Personal Config Paths

<!-- @work-item-id WI-214 -->
| Case | Expected |
|---|---|
| `install --personal --agent claude --apply` | `.phasegate-local/phasegate.config.json` contains `paths.principlesDocs` and `paths.folderRulesDoc`, and the corresponding local docs are created. |
| UT-INS-WI215-001 | personal Codex install with no `AGENTS.md` | creates root `AGENTS.md`, records it in the manifest, and adds `AGENTS.md` to `.git/info/exclude` |
| UT-INS-WI215-002 | personal Codex install with existing non-managed `AGENTS.md` | leaves the file byte-identical and reports manual readiness instead of writing `AGENTS.override.md` |
| UT-INS-WI215-003 | personal doctor with only legacy `.codex/AGENTS.local.md` | reports `codex-context-missing` instead of green |

## WI-212 Init Language Unit Tests

<!-- @work-item-id WI-212 -->

- `init --language typescript --yes` writes TypeScript language metadata without changing existing TypeScript defaults.
- `init --language python --yes` writes `project.languages: ["python"]`.
- `init --yes` without language keeps backward-compatible TypeScript resolution.

## WI-384 Codex hook matcher diagnostics

<!-- @work-item-id WI-384 -->

| ID | 日本語テストケース | 期待結果 |
|---|---|---|
| UT-WI384-DOC-001 | Bash-only phasegate hooks を検査する | apply_patch 欠落 red |
| UT-WI384-DOC-002..003 | Pre または Post だけ current にする | 欠落 event を特定した red |
| UT-WI384-DOC-004 | 両 event が Bash と apply_patch を含む | finding なし |
| UT-WI384-DOC-005 | 別 entry に文字列だけ存在する | false PASS しない |
| UT-WI384-DOC-006..007 | malformed / customized stale config | manual / ai-assisted repair mode |

Vitest、semantic AAA、日本語かつ重複しない `it()`、`actual` 変数を用いる。
