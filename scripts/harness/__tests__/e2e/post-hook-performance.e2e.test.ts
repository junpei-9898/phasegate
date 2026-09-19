// @story H11-03
// @unit agent-integration
// @layer e2e-test
// @work-item-id WI-220
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const enabled = process.env.PHASEGATE_PERF === '1';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
type Variant = 'old' | 'candidate';
type Scenario = 'read' | 'disabled' | 'write';
type Cache = 'warm' | 'cold';
interface Sample {
  variant: Variant;
  scenario: Scenario;
  cache: Cache;
  wallMs: number;
  userSeconds: number;
  systemSeconds: number;
  maxRssBytes: number;
  lintRequests: number;
  observedSpawns: number;
  nodeStarts: number;
  logBytes: number;
  exitCode: number;
  diagnostic: string;
}

const preload = `
const fs = require('node:fs');
const cp = require('node:child_process');
const trace = process.env.PHASEGATE_PERF_TRACE;
const record = value => fs.appendFileSync(trace, JSON.stringify(value) + '\\n');
record({kind:'start',pid:process.pid});
const original = cp.spawn;
cp.spawn = function(command, args, options) {
  const child = original.apply(this, arguments);
  record({kind:'spawn',pid:child.pid,parent:process.pid,
    lint:process.argv.some(arg => arg.endsWith('post-tool-use-hook.ts')) && Array.isArray(args) && args.includes('phasegate:lint')});
  return child;
};
require('node:module').syncBuiltinESMExports();
`;

function timedHook(cwd: string, hook: string, payload: string, env: NodeJS.ProcessEnv) {
  return new Promise<{ wallMs: number; stderr: string; exitCode: number }>((accept, reject) => {
    const start = performance.now();
    const child = spawn('/usr/bin/time', ['-l', process.execPath, '--import', join(repoRoot, 'node_modules/tsx/dist/loader.mjs'), hook], {
      cwd, env, detached: true, stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';
    let timedOut = false;
    const cleanup = () => {
      if (!child.pid) return;
      try { process.kill(-child.pid, 'SIGKILL'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
    };
    const timer = setTimeout(() => { timedOut = true; cleanup(); }, 15000);
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const wallMs = performance.now() - start;
      try {
        cleanup(); // Dedicated benchmark process group only; includes old timeout orphans.
        if (timedOut) throw new Error('benchmark hook exceeded 15 seconds');
        accept({ wallMs, stderr, exitCode: code ?? -1 });
      } catch (error) { reject(error); }
    });
    child.stdin.end(payload);
  });
}

describe.skipIf(!enabled)('配布post hookの同条件性能比較', () => {
  it('旧新版を交互に計測し読取りと無効hookで候補版のlint起動と正常skipログがゼロであること', async () => {
    if (process.platform !== 'darwin') throw new Error('This measurement uses macOS /usr/bin/time -l; do not interpret it as cross-platform evidence');
    const oldInput = process.env.PHASEGATE_OLD_TARBALL;
    const candidateInput = process.env.PHASEGATE_TARBALL;
    const reportInput = process.env.PHASEGATE_PERF_REPORT;
    if (!oldInput || !candidateInput || !reportInput) throw new Error('Both archives and PHASEGATE_PERF_REPORT are required');
    const reportPath = resolve(reportInput);
    if (existsSync(reportPath)) throw new Error('Refusing to overwrite an existing performance report');
    const rounds = Number(process.env.PHASEGATE_PERF_ROUNDS ?? 30);
    if (!Number.isInteger(rounds) || rounds < 1) throw new Error('rounds must be a positive integer');
    const root = mkdtempSync(join(tmpdir(), 'phasegate-post-perf-'));
    const samples: Sample[] = [];
    try {
      const archives = { old: resolve(oldInput), candidate: resolve(candidateInput) };
      const hooks = {} as Record<Variant, string>;
      for (const variant of ['old', 'candidate'] as const) {
        const packageDir = join(root, variant);
        mkdirSync(packageDir);
        const extracted = spawnSync('tar', ['-xzf', archives[variant], '-C', packageDir, '--strip-components=1'], { encoding: 'utf8' });
        expect(extracted.status, extracted.stderr).toBe(0);
        symlinkSync(join(repoRoot, 'node_modules'), join(packageDir, 'node_modules'), 'dir');
        hooks[variant] = join(packageDir, 'scripts/harness/agent-integration/presentation/post-tool-use-hook.ts');
      }
      const project = join(root, 'project');
      mkdirSync(join(project, 'scripts/harness/sample'), { recursive: true });
      symlinkSync(join(repoRoot, 'node_modules'), join(project, 'node_modules'), 'dir');
      writeFileSync(join(project, 'scripts/harness/sample/a.ts'), 'export const value = 1;\n');
      const preloadPath = join(root, 'trace.cjs');
      writeFileSync(preloadPath, preload);
      const logPath = join(project, '.phasegate/hook-skip-events.jsonl');
      const measure = async (variant: Variant, scenario: Scenario, cache: Cache, sequence: number): Promise<Sample> => {
        writeFileSync(join(project, 'phasegate.config.json'), JSON.stringify({ project: { name: 'perf-fixture', preset: 'standard' }, harnesses: { cascadeUpdate: scenario !== 'disabled' } }));
        const trace = join(root, `trace-${sequence}.jsonl`);
        const beforeBytes = existsSync(logPath) ? statSync(logPath).size : 0;
        const env: NodeJS.ProcessEnv = { ...process.env, NODE_OPTIONS: `--require ${JSON.stringify(preloadPath)}`, PHASEGATE_PERF_TRACE: trace, npm_config_offline: 'true', PATH: `${join(repoRoot, 'node_modules/.bin')}:${process.env.PATH}` };
        if (cache === 'cold') env.TSX_DISABLE_CACHE = '1';
        else delete env.TSX_DISABLE_CACHE;
        const payload = JSON.stringify({ cwd: project, tool_name: scenario === 'read' ? 'Read' : 'Write', tool_input: { file_path: join(project, 'scripts/harness/sample/a.ts') } });
        const actual = await timedHook(project, hooks[variant], payload, env);
        const cpu = /([\d.]+) real\s+([\d.]+) user\s+([\d.]+) sys/.exec(actual.stderr);
        const rss = /(\d+)\s+maximum resident set size/.exec(actual.stderr);
        if (!cpu || !rss) throw new Error(`Missing time metrics: ${actual.stderr}`);
        const events = readFileSync(trace, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as { kind: string; lint?: boolean });
        return { variant, scenario, cache, wallMs: actual.wallMs, userSeconds: Number(cpu[2]), systemSeconds: Number(cpu[3]), maxRssBytes: Number(rss[1]), lintRequests: events.filter((event) => event.lint).length, observedSpawns: events.filter((event) => event.kind === 'spawn').length, nodeStarts: events.filter((event) => event.kind === 'start').length, logBytes: (existsSync(logPath) ? statSync(logPath).size : 0) - beforeBytes, exitCode: actual.exitCode, diagnostic: actual.stderr.split('\n').filter((line) => /TIMEOUT|Lint|検証未完了|HOOK_DISABLED/.test(line)).join('\n') };
      };
      let sequence = 0;
      for (const cache of ['warm', 'cold'] as const) {
        for (const scenario of ['read', 'disabled', 'write'] as const) {
          if (cache === 'warm') for (const variant of ['old', 'candidate'] as const) await measure(variant, scenario, cache, sequence++);
          for (let round = 0; round < rounds; round++) {
            const order: Variant[] = round % 2 ? ['candidate', 'old'] : ['old', 'candidate'];
            for (const variant of order) samples.push(await measure(variant, scenario, cache, sequence++));
          }
          console.log(`Measured ${cache}/${scenario}: ${rounds} pairs`);
        }
      }
      const percentile = (values: number[], fraction: number) => values.sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
      const summaries = [...new Set(samples.map((s) => `${s.cache}/${s.scenario}/${s.variant}`))].map((key) => {
        const group = samples.filter((s) => `${s.cache}/${s.scenario}/${s.variant}` === key);
        return { key, count: group.length, medianMs: percentile(group.map((s) => s.wallMs), 0.5), p95Ms: percentile(group.map((s) => s.wallMs), 0.95), medianCpuSeconds: percentile(group.map((s) => s.userSeconds + s.systemSeconds), 0.5), medianRssBytes: percentile(group.map((s) => s.maxRssBytes), 0.5), lintRequests: group.reduce((sum, s) => sum + s.lintRequests, 0), logBytes: group.reduce((sum, s) => sum + s.logBytes, 0), timeouts: group.filter((s) => s.diagnostic.includes('TIMEOUT')).length };
      });
      writeFileSync(reportPath, `${JSON.stringify({ node: process.version, platform: process.platform, rounds, cacheDefinition: 'warm=tsx disk cache after prewarm; cold=TSX_DISABLE_CACHE, not OS page-cache flush', resourceScope: 'time -l child accounting; old orphan cleanup is outside measured interval; spawn/start tracing adds overhead', archiveSha256: Object.fromEntries(Object.entries(archives).map(([key, archive]) => [key, createHash('sha256').update(readFileSync(archive)).digest('hex')])), summaries, samples }, null, 2)}\n`, { flag: 'wx' });
      for (const sample of samples.filter((s) => s.variant === 'candidate' && s.scenario !== 'write')) {
        expect(sample.lintRequests).toBe(0);
        expect(sample.logBytes).toBe(0);
        expect(sample.exitCode).toBe(0);
      }
      for (const sample of samples.filter((s) => s.variant === 'candidate' && s.scenario === 'write')) {
        expect(sample.lintRequests).toBe(1);
        expect(sample.diagnostic).toContain('Lint診断');
        expect(sample.diagnostic).not.toContain('TIMEOUT');
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 900_000);
});
