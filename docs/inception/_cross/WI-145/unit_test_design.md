---
traceability:
  initial_creation: true
work_item: WI-145
---

# Unit Test Design: WI-145

> **WI**: WI-145
> **Unit**: installation
> **作成日**: 2026-05-11
> **参照**: `description.md`, `logical_design.md`, `docs/product/construction/installation/domain_model.md`, `docs/principles/testing-rules.md`

## 1. テスト方針

@work-item-id WI-145

WI-145 の unit test は、IO を持たない domain ルールと application check の分岐を焦点化する。domain object は実体を使い、file system / crypto / manifest repository は Port mock に限定する。

主な観測対象:
- `DeploymentManifest` / `DeploymentEntry` / `DiagnosticReport` / `DiagnosticFinding` の不変条件
- 9 種 `HeuristicCheck` の pass / finding / `repairMode` 判定
- `RunDoctorDiagnosticsUseCase` の集約・並列 check 実行・status 導出
- formatter の human / json schema contract

## 2. Domain Unit Tests

@work-item-id WI-145

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| UT-WI145-DM-001 | `DeploymentEntry` | `mode="created"`, `block=null`, 有効な `sha256:` hash, ISO8601 `deployedAt` | 正常に生成され、全 field が immutable |
| UT-WI145-DM-002 | `DeploymentEntry` | `mode="merged"` かつ `block=null` | invariant violation を投げる |
| UT-WI145-DM-003 | `DeploymentEntry` | `mode="merged"` かつ managed block あり | 正常に生成される |
| UT-WI145-DM-004 | `DeploymentEntry` | `mode="symlink"` かつ `block=null` | 正常に生成される |
| UT-WI145-DM-005 | `Hash` | `sha256:` prefix + 64 hex chars | 正常に生成される |
| UT-WI145-DM-006 | `Hash` | prefix 欠落、短い hex、非 hex 文字のいずれか | error contract を返す |
| UT-WI145-DM-007 | `DeploymentManifest` | semver version と重複しない entries | 正常に生成され、`overall` mutation ができない |
| UT-WI145-DM-008 | `DeploymentManifest` | `entries[].path` が重複 | duplicate path error を投げる |
| UT-WI145-DM-009 | `DeploymentManifest.addEntry` | 既存 path と同じ entry を追加 | 同 path entry が差し替えられ、重複しない |
| UT-WI145-DM-010 | `DeploymentManifest.removeEntry` | 存在する path を削除 | 対象 entry のみ消えた新 instance を返す |
| UT-WI145-DM-011 | `DiagnosticFinding` | `repairMode="ai-assisted"` かつ `suggestedSkill=null` | invariant violation を投げる |
| UT-WI145-DM-012 | `DiagnosticFinding` | `repairMode="mechanical"` かつ `repairHint` あり | 正常に生成される |
| UT-WI145-DM-013 | `DiagnosticReport` | findings なし | `overallStatus="green"` |
| UT-WI145-DM-014 | `DiagnosticReport` | warn finding のみ | `overallStatus="warn"` |
| UT-WI145-DM-015 | `DiagnosticReport` | red finding を 1 件以上含む | `overallStatus="red"` |
| UT-WI145-DM-016 | `DiagnosticReport` | 同じ `checkId` の finding を 2 件含む | duplicate check error を投げる |
| UT-WI145-DM-017 | `RepairTable` | 9 種の `CheckId` を lookup | すべて定義済み結果を返し、未知 id は扱わない |

## 3. Application Unit Tests

@work-item-id WI-145

### 3.1 HeuristicCheck 共通観点

全 check は以下を共通に検証する。

| Case ID | 観点 | 期待結果 |
|---|---|---|
| UT-WI145-HC-COM-001 | 対象が pass 条件を満たす | `null` を返す |
| UT-WI145-HC-COM-002 | 対象 file が存在しない | finding を返し、原則 `repairMode="mechanical"` |
| UT-WI145-HC-COM-003 | 対象 file が存在し user customization を含む | finding を返し、必要に応じて `repairMode="ai-assisted"` + `suggestedSkill` |
| UT-WI145-HC-COM-004 | JSON parse 失敗や symlink 異常を検出 | finding を返し、`repairMode="manual"` |
| UT-WI145-HC-COM-005 | finding の `target` | product logical design の target path と一致する |

### 3.2 HeuristicCheck 個別ケース

| Case ID | Check | Arrange | 期待結果 |
|---|---|---|---|
| UT-WI145-HC-001 | `ClaudeHookMissingCheck` | `.claude/settings.json` に phasegate hook 4 種が存在 | pass |
| UT-WI145-HC-002 | `ClaudeHookMissingCheck` | settings はあるが phasegate hook なし、既存 hooks あり | `claude-hook-missing`, red, `ai-assisted` |
| UT-WI145-HC-003 | `ClaudeHookMissingCheck` | settings JSON parse 失敗 | `claude-hook-missing`, red, `manual` |
| UT-WI145-HC-004 | `CodexHookMissingCheck` | `.codex/hooks.json` に phasegate hook が存在 | pass |
| UT-WI145-HC-005 | `CodexHookMissingCheck` | hooks JSON は空 object | `codex-hook-missing`, red, `mechanical` |
| UT-WI145-HC-006 | `HuskyPreCommitMissingCheck` | managed block と `phasegate lint` を含む | pass |
| UT-WI145-HC-007 | `HuskyPreCommitMissingCheck` | custom script はあるが phasegate command なし | red, `ai-assisted` |
| UT-WI145-HC-008 | `HuskyCommitMsgMissingCheck` | `phasegate commit-msg` を含む | pass |
| UT-WI145-HC-009 | `HuskyCommitMsgMissingCheck` | file 欠落 | red, `mechanical` |
| UT-WI145-HC-010 | `HuskyPrePushMissingCheck` | `phasegate bypass:audit` を含む | pass |
| UT-WI145-HC-011 | `HuskyPrePushMissingCheck` | command 欠落 | warn, `mechanical` |
| UT-WI145-HC-012 | `CiWorkflowMissingCheck` | phasegate workflow file あり | pass |
| UT-WI145-HC-013 | `CiWorkflowMissingCheck` | workflows はあるが phasegate workflow なし | warn, `manual` |
| UT-WI145-HC-014 | `PackageJsonDevdepMissingCheck` | `devDependencies.phasegate` あり | pass |
| UT-WI145-HC-015 | `PackageJsonDevdepMissingCheck` | package.json 欠落または devDep 欠落 | red, `mechanical` |
| UT-WI145-HC-016 | `ClaudeSkillsSymlinkCheck` | `.claude/skills/phasegate` が phasegate skills を指す | pass |
| UT-WI145-HC-017 | `ClaudeSkillsSymlinkCheck` | symlink 欠落 | red, `mechanical` |
| UT-WI145-HC-018 | `CodexSkillsSymlinkCheck` | `.codex/skills/phasegate` が phasegate skills を指す | pass |
| UT-WI145-HC-019 | `CodexSkillsSymlinkCheck` | symlink target が phasegate 以外 | red, `manual` |

### 3.3 UseCase / Formatter

| Case ID | 対象 | Arrange | 期待結果 |
|---|---|---|---|
| UT-WI145-UC-001 | `RunDoctorDiagnosticsUseCase` | 9 checks がすべて pass | green report を返す |
| UT-WI145-UC-002 | `RunDoctorDiagnosticsUseCase` | red finding と warn finding が混在 | red report を返し、findings の checkId が一意 |
| UT-WI145-UC-003 | `RunDoctorDiagnosticsUseCase` | warn finding のみ、`strict=false` | report は warn、exitCode helper は 0 |
| UT-WI145-UC-004 | `RunDoctorDiagnosticsUseCase` | warn finding のみ、`strict=true` | report は warn、exitCode helper は 1 |
| UT-WI145-UC-005 | `RunDoctorDiagnosticsUseCase` | `repairMode!="mechanical"` finding を含む | warning 扱いとして strict 時に fail へ昇格できる |
| UT-WI145-UC-006 | `DiagnosticReportFormatter` | red report を human format | checkId / target / repairMode / fix or suggested skill が表示される |
| UT-WI145-UC-007 | `DiagnosticReportFormatter` | report を json format | `schemaVersion="1.0"` と必須 field を含む valid JSON |

## 4. Test File Placement

@work-item-id WI-145

| 種別 | 配置 |
|---|---|
| Domain unit | `scripts/harness/__tests__/unit/installation/*.test.ts` |
| HeuristicCheck unit | `scripts/harness/__tests__/unit/installation/checks/*.test.ts` |
| UseCase unit | `scripts/harness/__tests__/unit/installation/run-doctor-diagnostics-usecase.test.ts` |
| Formatter unit | `scripts/harness/__tests__/unit/installation/diagnostic-report-formatter.test.ts` |

## 5. Coverage Targets

@work-item-id WI-145

- Domain value objects / aggregates: branch coverage 95% 以上
- 9 HeuristicCheck: check ごとに pass / missing / customized / malformed の主要分岐を網羅
- UseCase: red / warn / green / strict の exit decision を網羅
- Formatter: human と json の field contract を網羅
