---
traceability:
  initial_creation: true
work_item: WI-145
---

# Integration Test Logic: WI-145

> **WI**: WI-145
> **Unit**: installation
> **作成日**: 2026-05-11
> **対応設計**: `it_test_design.md`

## 1. Test File Structure

@work-item-id WI-145

| Test file | Target | Cases |
|---|---|---:|
| `scripts/harness/__tests__/integration/installation/file-system-manifest-repository-adapter.test.ts` | manifest load/save/exists/archive | 7 |
| `scripts/harness/__tests__/integration/installation/node-fs-file-inspector-adapter.test.ts` | text/json/symlink read | 4 |
| `scripts/harness/__tests__/unit/installation/node-crypto-hash-adapter.test.ts` | crypto hash adapter | 1 |
| `scripts/harness/__tests__/integration/installation/doctor-handler.test.ts` | doctor CLI handler | 8 |
| `scripts/harness/__tests__/integration/installation/command-stubs.test.ts` | install/uninstall/reconcile stubs | 3 |
| `scripts/harness/__tests__/integration/installation/skill-deployer-manifest-builder.test.ts` | wrapper manifest conversion | 4 |

## 2. Temp Project Helper

@work-item-id WI-145

Use a temp project root per test and remove it in `afterEach`. Do not write outside the temp root.

```typescript
async function createTempProjectRoot(name: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), `phasegate-${name}-`));
}

async function writeProjectFile(projectRoot: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(projectRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf8');
}
```

Symlink helper:

```typescript
async function tryCreateSymlink(target: string, linkPath: string): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(linkPath), { recursive: true });
    await fs.symlink(target, linkPath);
    return true;
  } catch {
    return false;
  }
}
```

If symlink creation fails, skip only symlink integration cases with an explicit platform skip reason. Unit tests still cover symlink semantics.

## 3. Fixture Builder

@work-item-id WI-145

Fixture builders should create files programmatically instead of relying on large committed fixture trees. Golden JSON files may be committed if they are normalized.

| Builder | Required writes |
|---|---|
| `buildFullInstallProject` | package devDep, manifest, Claude/Codex hook JSON, husky 3 scripts, CI workflow, skills symlinks |
| `buildInertInstallProject` | package devDep, existing `.claude/settings.json` without phasegate hook |
| `buildPartialInstallProject` | package devDep, Claude hook present, selected Codex/husky/CI/skills targets missing |
| `buildNoPhasegateProject` | minimal package.json |

## 4. CLI Invocation Contract

@work-item-id WI-145

Prefer invoking the handler directly for most integration tests. Add one dispatcher-level test through `scripts/harness/main.ts` for `doctor` registration.

```typescript
const actual = await handler.execute({
  projectRoot,
  json: true,
  strict: false,
  reportOut: null,
});

expect(actual.exitCode).toBe(1);
const payload = JSON.parse(actual.stdout);
expect(payload.schemaVersion).toBe('1.0');
expect(payload.findings.map((finding) => finding.checkId)).toContain('claude-hook-missing');
```

## 5. Golden Normalization

@work-item-id WI-145

- Replace temp root with `<PROJECT_ROOT>`.
- Sort findings by `checkId` before comparing JSON golden.
- Assert exact `checkId`, `severity`, `target`, `repairMode`, `repairHint`, `suggestedSkill.invokeCommand`.
- Do not compare timestamps except with ISO8601 regex.
- Human output should be tested with key line containment, not full snapshot.
