---
traceability:
  initial_creation: true
---

# Integration Test Logic: installation

> **Unit ID**: installation
> **対応 WI**: WI-145 / WI-146 / WI-147 / WI-148
> **作成日**: 2026-05-11
> **対応設計**: `it_test_design.md`

## 1. WI-145 Test File Structure

@work-item-id WI-145

| Test file | Target | Cases |
|---|---|---:|
| `scripts/harness/__tests__/integration/installation/file-system-manifest-repository-adapter.test.ts` | manifest repository adapter | 7 |
| `scripts/harness/__tests__/integration/installation/node-fs-file-inspector-adapter.test.ts` | file inspector adapter | 4 |
| `scripts/harness/__tests__/unit/installation/node-crypto-hash-adapter.test.ts` | crypto hash adapter | 1 |
| `scripts/harness/__tests__/integration/installation/doctor-handler.test.ts` | doctor handler / formatter wiring | 8 |
| `scripts/harness/__tests__/integration/installation/command-stubs.test.ts` | install / uninstall / reconcile stubs | 3 |
| `scripts/harness/__tests__/integration/installation/skill-deployer-manifest-builder.test.ts` | skill deployer manifest wrapper | 4 |

## 2. WI-145 Temp FS Policy

@work-item-id WI-145

Each test creates a fresh temp project root and deletes it after assertion. Adapter tests may use real `fs/promises`, but must not rely on repository-local mutable state.

Required helpers:
- `createTempProjectRoot(name)`
- `writeProjectFile(projectRoot, relativePath, content)`
- `readProjectFile(projectRoot, relativePath)`
- `tryCreateSymlink(target, linkPath)`
- `normalizeProjectRoot(output, projectRoot)`

## 3. WI-145 Fixture Builder Policy

@work-item-id WI-145

Fixture projects are built programmatically:

| Builder | Diagnostic purpose |
|---|---|
| `buildFullInstallProject` | proves doctor does not report false positives |
| `buildInertInstallProject` | reproduces skip-on-exist silent failure |
| `buildPartialInstallProject` | proves partial deployment is diagnosed precisely |
| `buildNoPhasegateProject` | proves no-install project gets actionable red findings |

Symlink creation failures skip only symlink integration cases. Symlink decision logic remains covered by unit tests.

## 4. WI-145 Golden Policy

@work-item-id WI-145

- JSON findings are sorted by `checkId` before comparison.
- Temp paths are normalized to `<PROJECT_ROOT>`.
- Timestamps are checked with ISO8601 regex only.
- Human output verifies status, representative finding lines, repair hints, and suggested skill command.
- `--report-out` tests verify stdout and written JSON separately.

## 5. WI-145 Dispatcher Pattern

@work-item-id WI-145

Most tests call `DoctorHandler.execute` directly. One smoke test calls `main.ts doctor --json` through the existing CLI test harness to verify command registration.
