---
traceability:
  initial_creation: true
---

# Unit Test Logic: installation

> **Unit ID**: installation
> **対応 WI**: WI-145 / WI-146 / WI-147 / WI-148
> **作成日**: 2026-05-11
> **対応設計**: `unit_test_design.md`

## 1. WI-145 Test File Structure

@work-item-id WI-145

| Test file | Target | Cases |
|---|---|---:|
| `scripts/harness/__tests__/unit/installation/deployment-entry.test.ts` | DeploymentEntry / Hash / ManagedBlock | 6 |
| `scripts/harness/__tests__/unit/installation/deployment-manifest.test.ts` | DeploymentManifest | 5 |
| `scripts/harness/__tests__/unit/installation/diagnostic-finding.test.ts` | DiagnosticFinding / RepairMode / SuggestedSkill | 4 |
| `scripts/harness/__tests__/unit/installation/diagnostic-report.test.ts` | DiagnosticReport | 4 |
| `scripts/harness/__tests__/unit/installation/repair-table.test.ts` | RepairTable | 2 |
| `scripts/harness/__tests__/unit/installation/checks/*.test.ts` | 9 HeuristicCheck implementations | 19 |
| `scripts/harness/__tests__/unit/installation/run-doctor-diagnostics-usecase.test.ts` | RunDoctorDiagnosticsUseCase | 5 |
| `scripts/harness/__tests__/unit/installation/diagnostic-report-formatter.test.ts` | DiagnosticReportFormatter | 2 |

## 2. WI-145 Helper Policy

@work-item-id WI-145

Shared factories may be added to `scripts/harness/__tests__/helpers/test-helpers.ts` when reused by multiple installation test files:
- `createInstallationHash`
- `createDeploymentEntry`
- `createDeploymentManifest`
- `createDiagnosticFinding`
- `createFileInspectorPortMock`

Port mocks use `vi.fn()` and are configured per test. Domain objects are real instances.

## 3. WI-145 Assertion Policy

@work-item-id WI-145

- Value object failures verify error message fragments that identify the violated invariant.
- Finding assertions verify exact `checkId`, `severity`, `target`, `repairMode`, and repair field.
- UseCase assertions verify `overallStatus`, finding uniqueness, and strict exit decision.
- Formatter JSON assertions parse stdout and verify stable field values.
- Formatter human assertions use key-line containment.

## 4. WI-145 Representative Pattern

@work-item-id WI-145

```typescript
target('RunDoctorDiagnosticsUseCase', () => {
  context('red finding と warn finding が混在する場合', () => {
    it('red report を返すこと', async () => {
      // Arrange
      const checks = [
        createFakeCheck(createDiagnosticFinding({ checkId: 'claude-hook-missing', severity: 'red' })),
        createFakeCheck(createDiagnosticFinding({ checkId: 'ci-workflow-missing', severity: 'warn' })),
      ];
      const sut = new RunDoctorDiagnosticsUseCase(checks, createFileInspectorPortMock());

      // Act
      const actual = await sut.execute({ projectRoot: '/tmp/project', strict: false });

      // Assert
      expect(actual.report.overallStatus).toBe('red');
      expect(actual.exitCode).toBe(1);
      expect(actual.report.findings.map((finding) => finding.checkId)).toEqual([
        'claude-hook-missing',
        'ci-workflow-missing',
      ]);
    });
  });
});
```
