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
