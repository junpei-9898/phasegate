// @story H12-05
// @unit skill-quality
// @layer e2e-test
// @work-item-id WI-220
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';
import { expect, it } from 'vitest';
import { runInCwd, withTempDir } from './cli-test-helpers.js';

it('公開タグ更新は予告では本文を変えず適用後もソース構文を保ち再実行で重複しないこと', () => {
  withTempDir((cwd) => {
    // Arrange: real CLI defaults include both source and documentation.
    mkdirSync(join(cwd, 'docs'));
    mkdirSync(join(cwd, 'scripts'));
    const sourcePath = join(cwd, 'scripts/example.ts');
    const docPath = join(cwd, 'docs/example.md');
    const source = 'export const value = 1;\n';
    const doc = '# Existing design\n@story-id WI-220';
    writeFileSync(sourcePath, source);
    writeFileSync(docPath, doc);
    const args = ['skill:apply-cascade-update', '--story', 'WI-22', '--json'];

    // Act / Assert: preview is non-mutating.
    const preview = runInCwd(cwd, ...args, '--dry-run');
    expect(preview.exitCode, preview.stderr).toBe(0);
    expect(JSON.parse(preview.stdout)).toMatchObject({ updatedCount: 2, dryRun: true, semanticReviewPerformed: false });
    expect(readFileSync(sourcePath, 'utf8')).toBe(source);
    expect(readFileSync(docPath, 'utf8')).toBe(doc);

    // Act / Assert: apply preserves source syntax and original design content.
    const applied = runInCwd(cwd, ...args);
    expect(applied.exitCode, applied.stderr).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({ updatedCount: 2, appliedStoryIds: ['@work-item-id WI-22'], errors: [] });
    const actualSource = readFileSync(sourcePath, 'utf8');
    expect(actualSource).toBe(`${source}\n// @work-item-id WI-22`);
    expect(readFileSync(docPath, 'utf8')).toBe(`${doc}\n@work-item-id WI-22`);
    const compiled = ts.transpileModule(actualSource, { fileName: 'example.ts', reportDiagnostics: true });
    expect(compiled.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error)).toEqual([]);

    // Act / Assert: an explicit rerun is idempotent.
    const actual = runInCwd(cwd, ...args);
    expect(actual.exitCode, actual.stderr).toBe(0);
    expect(JSON.parse(actual.stdout)).toMatchObject({ updatedCount: 0, appliedStoryIds: [], errors: [] });
    expect(readFileSync(sourcePath, 'utf8')).toBe(actualSource);
    expect(readFileSync(docPath, 'utf8')).toBe(`${doc}\n@work-item-id WI-22`);
  });
}, 30000);
