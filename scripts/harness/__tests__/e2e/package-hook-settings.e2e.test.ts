// @story H11-03
// @unit agent-integration
// @layer e2e-test
// @work-item-id WI-220
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

function hook(cwd: string, entry: string, trace: string, preload: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((accept, reject) => {
    const child = spawn(process.execPath, ['--import', join(repoRoot, 'node_modules/tsx/dist/loader.mjs'), entry], {
      cwd, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: `--require ${JSON.stringify(preload)}`, WI220_SPAWN_TRACE: trace, npm_config_offline: 'true', PATH: `${join(repoRoot, 'node_modules/.bin')}:${process.env.PATH}` },
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const cleanup = () => {
      if (child.pid && process.platform !== 'win32') {
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
      }
    };
    const timer = setTimeout(() => { timedOut = true; cleanup(); }, 20000);
    child.stdout.on('data', value => { stdout += value; });
    child.stderr.on('data', value => { stderr += value; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      try {
        cleanup(); // Only this test invocation's dedicated process group, including old timeout descendants.
        if (timedOut) throw new Error('hook fixture exceeded its deadline');
        accept({ code: code ?? -1, stdout, stderr });
      } catch (error) { reject(error); }
    });
    child.stdin.end(JSON.stringify({ cwd, tool_name: 'Write', tool_input: { file_path: join(cwd, 'scripts/harness/sample/a.ts') } }));
  });
}

describe.skipIf(process.env.PHASEGATE_UPGRADE_SMOKE !== '1')('旧新配布hookのroot/local設定互換', () => {
  it.each([
    { rootValue: false, localValue: true, enabled: false },
    { rootValue: true, localValue: false, enabled: true },
    { rootValue: undefined, localValue: false, enabled: false },
    { rootValue: undefined, localValue: true, enabled: true },
  ])('root=$rootValue local=$localValueで既存有効値$enabledと設定原文を保持すること', async ({ rootValue, localValue, enabled }) => {
    // Arrange: archived entrypoints, shared dependencies; separate from npm-install smoke.
    if (process.platform === 'win32') throw new Error('This fixture requires POSIX process groups; do not claim Windows verification');
    const archives = { old: process.env.PHASEGATE_OLD_TARBALL, candidate: process.env.PHASEGATE_TARBALL };
    if (!archives.old || !archives.candidate) throw new Error('Both fixed archive paths are required');
    const root = mkdtempSync(join(tmpdir(), 'phasegate-hook-settings-'));
    try {
      const preload = join(root, 'trace.cjs');
      writeFileSync(preload, `const cp=require('node:child_process'),fs=require('node:fs');
const original=cp.spawn;cp.spawn=function(command,args,options){
if(process.argv.some(arg=>arg.endsWith('post-tool-use-hook.ts'))&&Array.isArray(args)&&args.includes('phasegate:lint'))fs.appendFileSync(process.env.WI220_SPAWN_TRACE,'lint\\n');
return original.apply(this,arguments);};require('node:module').syncBuiltinESMExports();\n`);
      for (const [variant, archive] of Object.entries(archives)) {
        const packageRoot = join(root, variant);
        mkdirSync(packageRoot);
        const unpack = spawnSync('tar', ['-xzf', resolve(archive!), '-C', packageRoot, '--strip-components=1'], { encoding: 'utf8' });
        expect(unpack.status, unpack.stderr).toBe(0);
        symlinkSync(join(repoRoot, 'node_modules'), join(packageRoot, 'node_modules'), 'dir');
        const project = join(root, `${variant}-project`);
        mkdirSync(join(project, 'scripts/harness/sample'), { recursive: true });
        mkdirSync(join(project, '.phasegate-local'));
        symlinkSync(join(repoRoot, 'node_modules'), join(project, 'node_modules'), 'dir');
        writeFileSync(join(project, 'scripts/harness/sample/a.ts'), 'export const value = 1;\n');
        const config = (value: boolean) => `${JSON.stringify({ project: { name: 'local-settings', preset: 'standard' }, harnesses: { cascadeUpdate: value } }, null, 2)}\n`;
        const rootConfig = join(project, 'phasegate.config.json');
        const localConfig = join(project, '.phasegate-local/phasegate.config.json');
        if (rootValue !== undefined) writeFileSync(rootConfig, config(rootValue));
        writeFileSync(localConfig, config(localValue));
        const trace = join(root, `${variant}.trace`);

        // Act
        const actual = await hook(project, join(packageRoot, 'scripts/harness/agent-integration/presentation/post-tool-use-hook.ts'), trace, preload);

        // Assert: actual process launches, not only a mocked setting getter.
        if (enabled && variant === 'old') expect([0, 1], actual.stderr).toContain(actual.code);
        else expect(actual.code, actual.stderr).toBe(0);
        expect(actual.stdout).toBe('');
        expect(existsSync(trace) ? readFileSync(trace, 'utf8').trim().split('\n').length : 0).toBe(enabled ? 1 : 0);
        if (enabled && variant === 'candidate') expect(actual.stderr).toContain('Lint診断');
        if (enabled && variant === 'old') expect(actual.stderr).toMatch(/TIMEOUT_EXCEEDED|Lint失敗/);
        if (!enabled && variant === 'candidate') {
          expect(actual.stderr).toBe('');
          expect(existsSync(join(project, '.phasegate/hook-skip-events.jsonl'))).toBe(false);
        }
        if (rootValue === undefined) expect(existsSync(rootConfig)).toBe(false);
        else expect(readFileSync(rootConfig, 'utf8')).toBe(config(rootValue));
        expect(readFileSync(localConfig, 'utf8')).toBe(config(localValue));
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 60000);
});
