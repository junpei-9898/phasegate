// @story H11-01
// @unit harness-api
// @layer e2e-test
// @work-item-id WI-220
import { chmodSync, existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runInCwd, withTempDir } from './cli-test-helpers.js';

const planArgs = ['config:plan', '--intent', 'quick-mode-relax', '--json'];

describe('設定復旧コマンドのデータ保全', () => {
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('読込権限がない設定を置換せず権限復旧後には適用できること', () => {
    withTempDir((cwd) => {
      const initialized = runInCwd(cwd, 'init', '--name', 'permission-recovery');
      expect(initialized.exitCode, initialized.stderr).toBe(0);
      const path = join(cwd, 'phasegate.config.json');
      const before = readFileSync(path, 'utf8');
      const mode = statSync(path).mode;
      const entries = readdirSync(cwd, { recursive: true }).sort();
      chmodSync(path, 0);
      try {
        const actual = runInCwd(cwd, ...planArgs, '--apply');
        expect(actual.exitCode, actual.stderr).toBe(1);
        expect(JSON.parse(actual.stdout)).toMatchObject({ refused: true, configPatch: { applicability: 'blocked', operations: [] } });
        expect(JSON.parse(actual.stdout).error).toContain('permissions');
        expect(readdirSync(cwd, { recursive: true }).sort()).toEqual(entries);
      } finally {
        chmodSync(path, mode);
      }
      expect(readFileSync(path, 'utf8')).toBe(before);
      const recovered = runInCwd(cwd, ...planArgs, '--apply');
      expect(recovered.exitCode, recovered.stderr).toBe(0);
      expect(JSON.parse(readFileSync(path, 'utf8')).quickMode.allowedCategories).toEqual(['bugfix', 'docs', 'test', 'config']);
    });
  }, 30000);

  it.each(['broken', 'missing'] as const)('読み込めない設定は上書きせず明示修復後には再開できること（%s）', (state) => {
    withTempDir((cwd) => {
      // Arrange: retain a known-good copy as an operator-owned recovery source.
      const initialized = runInCwd(cwd, 'init', '--name', 'recovery-safety');
      expect(initialized.exitCode, initialized.stderr).toBe(0);
      const path = join(cwd, 'phasegate.config.json');
      const valid = readFileSync(path, 'utf8');
      const broken = '{"project":{"name":"preserve-user-data"},"quickMode":\n';
      if (state === 'broken') writeFileSync(path, broken);
      else unlinkSync(path);
      const entries = readdirSync(cwd, { recursive: true }).sort();
      const unchanged = () => {
        expect(existsSync(path)).toBe(state === 'broken');
        if (state === 'broken') expect(readFileSync(path, 'utf8')).toBe(broken);
        expect(readdirSync(cwd, { recursive: true }).sort()).toEqual(entries);
      };

      // Act / Assert: preview and explicit retries preserve the original state.
      const preview = runInCwd(cwd, ...planArgs, '--dry-run');
      expect(preview.exitCode, preview.stderr).toBe(0);
      const previewPlan = JSON.parse(preview.stdout);
      if (state === 'missing') {
        expect(previewPlan.configPatch).toMatchObject({
          applicability: 'applicable', before: null, blockedReason: null,
          after: { quickMode: { allowedCategories: ['bugfix', 'docs', 'test', 'config'] } },
          operations: [{ op: 'add', pointer: '/quickMode/allowedCategories', before: null, after: ['bugfix', 'docs', 'test', 'config'] }],
        });
        expect(previewPlan.commands[0]).toBe('phasegate install --dry-run');
      } else {
        expect(previewPlan.configPatch).toMatchObject({ applicability: 'blocked', operations: [] });
        expect(previewPlan.configPatch.blockedReason).toContain('Restore');
      }
      unchanged();
      for (let attempt = 0; attempt < 2; attempt++) {
        const actual = runInCwd(cwd, ...planArgs, '--apply');
        expect(actual.exitCode, actual.stderr).toBe(1);
        expect(JSON.parse(actual.stdout)).toMatchObject({ refused: true, configPatch: previewPlan.configPatch });
        expect(JSON.parse(actual.stdout).error).toContain(state === 'missing' ? 'install --dry-run' : 'Restore');
        unchanged();
      }

      // Act / Assert: authorized operator repair, not an automatic hook bypass.
      writeFileSync(path, valid);
      const recovered = runInCwd(cwd, ...planArgs, '--apply');
      expect(recovered.exitCode, recovered.stderr).toBe(0);
      expect(JSON.parse(recovered.stdout).applyResult.changed).toBe(true);
      expect(JSON.parse(readFileSync(path, 'utf8')).quickMode.allowedCategories).toEqual(['bugfix', 'docs', 'test', 'config']);
    });
  }, 30000);

  it('有効設定のbackupは書式を含む原文を保持し適用後も読み込めること', () => {
    withTempDir((cwd) => {
      const initialized = runInCwd(cwd, 'init', '--name', 'backup-safety');
      expect(initialized.exitCode, initialized.stderr).toBe(0);
      const path = join(cwd, 'phasegate.config.json');
      const before = `  ${JSON.stringify(JSON.parse(readFileSync(path, 'utf8')))}\r\n\r\n`;
      writeFileSync(path, before);

      const actual = runInCwd(cwd, ...planArgs, '--apply');

      expect(actual.exitCode, actual.stderr).toBe(0);
      const backup = JSON.parse(actual.stdout).applyResult.backupPath;
      expect(readFileSync(join(cwd, backup), 'utf8')).toBe(before);
      const repeated = runInCwd(cwd, ...planArgs, '--dry-run');
      expect(repeated.exitCode, repeated.stderr).toBe(0);
      expect(JSON.parse(repeated.stdout).configPatch.applicability).toBe('applicable');
    });
  }, 30000);

  it('非設定intentとschema不正の既存終了契約を保つこと', () => {
    withTempDir((cwd) => {
      const path = join(cwd, 'phasegate.config.json');
      const nonConfig = runInCwd(cwd, 'config:plan', '--intent', 'codex-hooks', '--dry-run', '--json');
      expect(nonConfig.exitCode, nonConfig.stderr).toBe(0);
      expect(JSON.parse(nonConfig.stdout).configPatch.applicability).toBe('not-applicable');
      const invalid = '{"project":42}\n';
      writeFileSync(path, invalid);

      const actual = runInCwd(cwd, ...planArgs, '--apply');

      expect(actual.exitCode, actual.stderr).toBe(2);
      expect(actual.stderr).toContain('Invalid phasegate.config.json');
      expect(readFileSync(path, 'utf8')).toBe(invalid);
    });
  }, 30000);
});
