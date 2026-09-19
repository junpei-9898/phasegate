// @story H11-01
// @unit harness-api
// @layer e2e-test
// @work-item-id WI-220
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runInCwd, withTempDir } from './cli-test-helpers.js';

const main = fileURLToPath(new URL('../../main.ts', import.meta.url));
const preload = fileURLToPath(new URL('../fixtures/wi-220/interrupt-config-write.cjs', import.meta.url));
const tsx = createRequire(import.meta.url).resolve('tsx');
const cases = ['backup', 'temporary', 'rename'].flatMap(point => ['before', 'after'].map(when => ({ point, when })));

describe('設定更新の書込境界で中断した後の再開', () => {
  it.each(cases)('$pointの$whenで中断しても有効設定と利用者の後続編集を保持すること', ({ point, when }) => {
    withTempDir(cwd => {
      expect(runInCwd(cwd, 'init', '--name', 'interruption').exitCode).toBe(0);
      const config = join(cwd, 'phasegate.config.json');
      const original = readFileSync(config, 'utf8');
      const notes = join(cwd, 'user-notes.md');
      writeFileSync(notes, 'User-owned notes before update.\n');
      const args = ['config:plan', '--intent', 'quick-mode-relax', '--apply', '--json'];

      const actual = spawnSync(process.execPath, ['--require', preload, '--import', tsx, main, ...args], {
        cwd, encoding: 'utf8', timeout: 30000,
        env: { ...process.env, PHASEGATE_FAULT_ROOT: realpathSync(cwd), PHASEGATE_FAULT_POINT: point, PHASEGATE_FAULT_WHEN: when },
      });

      expect(actual.status, actual.stderr).toBe(86);
      const current = readFileSync(config, 'utf8');
      const parsed = JSON.parse(current);
      if (point === 'rename' && when === 'after') expect(parsed.quickMode.allowedCategories).toEqual(['bugfix', 'docs', 'test', 'config']);
      else expect(current).toBe(original);
      const backupRoot = join(cwd, '.phasegate/backups');
      const backups = existsSync(backupRoot) ? readdirSync(backupRoot) : [];
      expect(backups.length).toBe(point === 'backup' && when === 'before' ? 0 : 1);
      for (const backup of backups) expect(readFileSync(join(backupRoot, backup), 'utf8')).toBe(original);
      expect(readFileSync(notes, 'utf8')).toBe('User-owned notes before update.\n');

      writeFileSync(notes, 'User-owned notes before update.\nUser addition after interruption.\n');
      const preview = runInCwd(cwd, 'config:plan', '--intent', 'quick-mode-relax', '--dry-run', '--json');
      expect(preview.exitCode, preview.stderr).toBe(0);
      expect(JSON.parse(preview.stdout).configPatch.applicability).toBe('applicable');
      const resumed = runInCwd(cwd, ...args);
      expect(resumed.exitCode, resumed.stderr).toBe(0);
      expect(JSON.parse(readFileSync(config, 'utf8')).quickMode.allowedCategories).toEqual(['bugfix', 'docs', 'test', 'config']);
      expect(readFileSync(notes, 'utf8')).toBe('User-owned notes before update.\nUser addition after interruption.\n');
    });
  }, 30000);
});
