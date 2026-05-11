---
traceability:
  initial_creation: true
work_item: WI-145
---

# Unit Test Logic: WI-145

> **WI**: WI-145
> **Unit**: installation
> **作成日**: 2026-05-11
> **対応設計**: `unit_test_design.md`

## 1. Test File Structure

@work-item-id WI-145

| Test file | Target | Cases |
|---|---|---:|
| `scripts/harness/__tests__/unit/installation/deployment-entry.test.ts` | `DeploymentEntry`, `Hash`, `ManagedBlock` | 6 |
| `scripts/harness/__tests__/unit/installation/deployment-manifest.test.ts` | `DeploymentManifest` | 5 |
| `scripts/harness/__tests__/unit/installation/diagnostic-finding.test.ts` | `DiagnosticFinding`, `RepairMode`, `SuggestedSkill` | 4 |
| `scripts/harness/__tests__/unit/installation/diagnostic-report.test.ts` | `DiagnosticReport` | 4 |
| `scripts/harness/__tests__/unit/installation/repair-table.test.ts` | `RepairTable` | 2 |
| `scripts/harness/__tests__/unit/installation/checks/*.test.ts` | 9 `HeuristicCheck` implementations | 19 |
| `scripts/harness/__tests__/unit/installation/run-doctor-diagnostics-usecase.test.ts` | `RunDoctorDiagnosticsUseCase` | 5 |
| `scripts/harness/__tests__/unit/installation/diagnostic-report-formatter.test.ts` | human/json formatter | 2 |

## 2. Shared Helpers

@work-item-id WI-145

Add helper factories to `scripts/harness/__tests__/helpers/test-helpers.ts` only if they are reused by at least two files.

```typescript
export const createInstallationHash = (
  value = 'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
) => Hash.from(value);

export const createDeploymentEntry = (
  overrides: Partial<DeploymentEntryInput> = {},
) =>
  DeploymentEntry.create({
    path: '.claude/settings.json',
    mode: 'created',
    block: null,
    hash: createInstallationHash(),
    deployedAt: '2026-05-11T00:00:00.000Z',
    ...overrides,
  });

export const createDiagnosticFinding = (
  overrides: Partial<DiagnosticFindingInput> = {},
) =>
  DiagnosticFinding.create({
    checkId: 'package-json-devdep-missing',
    severity: 'red',
    target: 'package.json',
    message: 'package.json に phasegate devDependency がありません',
    repairMode: 'mechanical',
    repairHint: 'npx phasegate install --apply',
    suggestedSkill: null,
    ...overrides,
  });
```

## 3. Mock Port Patterns

@work-item-id WI-145

`FileInspectorPort` は object literal + `vi.fn()` で作る。各 test は Arrange で必要な method だけ戻り値を明示する。

```typescript
function createFileInspectorPortMock(): FileInspectorPort {
  return {
    exists: vi.fn().mockResolvedValue(false),
    readText: vi.fn().mockResolvedValue(null),
    readJson: vi.fn().mockResolvedValue(null),
    readSymlink: vi.fn().mockResolvedValue(null),
  };
}
```

`HeuristicCheck` の unit test では filesystem を使わない。`RunDoctorDiagnosticsUseCase` は fake checks を注入し、check 実装の詳細とは分離する。

## 4. Assertion Contract

@work-item-id WI-145

- Error case は `toThrow` だけにせず、可能なら error code / message fragment / target path を検証する。
- Finding は `checkId`, `severity`, `target`, `repairMode`, `repairHint`, `suggestedSkill` を exact value で検証する。
- Report は `overallStatus` と `findings` の order-insensitive set を検証する。
- Formatter JSON は `JSON.parse` 後に shape ではなく必須 field の exact value を検証する。
- Human output は checkId と repair hint / invoke command の包含を検証し、全文 snapshot は使わない。

## 5. Representative Logic Sketch

@work-item-id WI-145

```typescript
target('ClaudeHookMissingCheck', () => {
  context('既存設定にユーザーのhookがあるがphasegate hookがない場合', () => {
    it('ai-assistedのfindingを返すこと', async () => {
      // Arrange
      const inspector = createFileInspectorPortMock();
      vi.mocked(inspector.exists).mockResolvedValue(true);
      vi.mocked(inspector.readJson).mockResolvedValue({
        hooks: { Stop: [{ command: 'custom command' }] },
      });
      const sut = new ClaudeHookMissingCheck();

      // Act
      const actual = await sut.run('/tmp/project', inspector);

      // Assert
      expect(actual?.checkId).toBe('claude-hook-missing');
      expect(actual?.severity).toBe('red');
      expect(actual?.repairMode).toBe('ai-assisted');
      expect(actual?.suggestedSkill?.invokeCommand).toBe('invoke /phasegate-config-doctor');
    });
  });
});
```
