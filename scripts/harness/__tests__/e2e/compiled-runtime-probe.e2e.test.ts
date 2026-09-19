// @story H11-01
// @unit harness-api
// @layer e2e-test
// @work-item-id WI-220
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(import.meta.url);
const enabled = process.env.PHASEGATE_COMPILED_PROBE === '1';

describe.skipIf(!enabled)('事前コンパイルしたCLIの隔離予備比較', () => {
  it('既存の出力と終了状態を保つ生成物で起動時間を比較できること', async () => {
    // Arrange: no production package/bin changes and no install into the user project.
    const reportPath = process.env.PHASEGATE_COMPILED_REPORT;
    if (!reportPath || existsSync(reportPath)) throw new Error('A new PHASEGATE_COMPILED_REPORT path is required');
    // Match the public bin's canonical package path (macOS /var -> /private/var).
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'phasegate-compiled-probe-')));
    const generated = join(root, 'runtime');
    const project = join(root, 'project');
    const sourceRoot = join(repoRoot, 'scripts/harness');
    const sources: string[] = [];
    const assets: string[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const file = join(directory, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (entry.isFile() && entry.name.endsWith('.ts')) sources.push(file);
        else if (entry.isFile() && entry.name.endsWith('.json')) assets.push(file);
      }
    };
    try {
      visit(sourceRoot);
      sources.sort();
      assets.sort();
      mkdirSync(generated);
      cpSync(join(repoRoot, 'package.json'), join(generated, 'package.json'));
      symlinkSync(join(repoRoot, 'node_modules'), join(generated, 'node_modules'), 'dir');
      for (const file of assets) {
        const destination = join(generated, relative(repoRoot, file));
        mkdirSync(dirname(destination), { recursive: true });
        cpSync(file, destination);
      }
      // esbuild is supplied by the installed tsx dependency in this prototype only.
      const builder = createRequire(require.resolve('tsx/package.json'))('esbuild') as {
        build(options: Record<string, unknown>): Promise<unknown>;
      };
      await builder.build({ entryPoints: sources, outbase: repoRoot, outdir: generated, bundle: false, platform: 'node', format: 'esm', target: 'node18', sourcemap: true, logLevel: 'silent' });
      mkdirSync(join(project, 'scripts/harness/sample'), { recursive: true });
      symlinkSync(join(repoRoot, 'node_modules'), join(project, 'node_modules'), 'dir');
      writeFileSync(join(project, 'scripts/harness/sample/a.ts'), 'export const value = 1;\n');
      writeFileSync(join(project, 'phasegate.config.json'), JSON.stringify({ project: { name: 'compiled-probe', preset: 'standard' } }));
      const samples: { scenario: string; variant: string; wallMs: number; exitCode: number | null }[] = [];
      const run = (variant: 'tsx' | 'compiled', args: string[]) => {
        const command = variant === 'tsx'
          ? [require.resolve('tsx/cli'), join(sourceRoot, 'main.ts'), ...args]
          : ['--enable-source-maps', join(generated, 'scripts/harness/main.js'), ...args];
        const started = performance.now();
        const actual = spawnSync(process.execPath, command, { cwd: project, encoding: 'utf8', timeout: 15000, env: { ...process.env, NODE_ENV: 'test' } });
        if (actual.error) throw actual.error;
        return { exitCode: actual.status, stdout: actual.stdout, stderr: actual.stderr, wallMs: performance.now() - started };
      };

      // Act / Assert: compare actual diagnostics before interpreting timing.
      for (const [scenario, args] of [['help', ['--help']], ['lint', ['phasegate:lint', '--json']]] as const) {
        const baseline = run('tsx', [...args]);
        const prewarm = run('compiled', [...args]);
        expect(prewarm.exitCode, prewarm.stderr).toBe(baseline.exitCode);
        expect(prewarm.stdout).toBe(baseline.stdout);
        expect(prewarm.stderr).toBe(baseline.stderr);
        if (scenario === 'lint') {
          expect(baseline.exitCode).toBe(1);
          expect(JSON.parse(baseline.stdout)).toMatchObject({ status: 'fail', errors: expect.arrayContaining([expect.objectContaining({ code: 'require-layer-comment' })]) });
        } else expect(baseline.exitCode).toBe(0);
        for (let round = 0; round < 5; round++) {
          const order = round % 2 ? ['compiled', 'tsx'] as const : ['tsx', 'compiled'] as const;
          for (const variant of order) {
            const actual = run(variant, [...args]);
            expect(actual.exitCode, actual.stderr).toBe(baseline.exitCode);
            expect(actual.stdout).toBe(baseline.stdout);
            expect(actual.stderr).toBe(baseline.stderr);
            samples.push({ scenario, variant, wallMs: actual.wallMs, exitCode: actual.exitCode });
          }
        }
      }
      const digest = createHash('sha256');
      for (const file of [...sources, ...assets, join(repoRoot, 'package.json')]) digest.update(relative(repoRoot, file)).update('\0').update(readFileSync(file)).update('\0');
      writeFileSync(reportPath, `${JSON.stringify({ node: process.version, platform: process.platform, inputSha256: digest.digest('hex'), sourceCount: sources.length, assetCount: assets.length, scope: 'CLI only; generated fixture uses checkout dependencies; not distribution or hook compatibility; warm disk cache; five alternating pairs', samples }, null, 2)}\n`, { flag: 'wx' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 120000);
});
