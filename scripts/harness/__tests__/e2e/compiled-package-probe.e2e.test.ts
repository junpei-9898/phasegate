// @story H11-01
// @unit harness-api
// @layer e2e-test
// @work-item-id WI-220
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe.skipIf(process.env.PHASEGATE_COMPILED_PACKAGE_PROBE !== '1')('既存配布入口を保持するコンパイル配布物の試作', () => {
  it('TSとassetsを保持したJS追加archiveを隔離環境で生成できること', async () => {
    const input = process.env.PHASEGATE_TARBALL;
    const destination = process.env.PHASEGATE_COMPILED_PACKAGE_DIR;
    if (!input || !destination || !existsSync(destination)) throw new Error('Input archive and existing fresh output directory are required');
    if (readdirSync(destination).length) throw new Error('Output directory must be empty');
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'phasegate-compiled-package-')));
    try {
      const extracted = spawnSync('tar', ['-xzf', resolve(input), '-C', root, '--strip-components=1'], { encoding: 'utf8' });
      expect(extracted.status, extracted.stderr).toBe(0);
      const originals = new Map<string, string>();
      const sources: string[] = [];
      const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
      const visit = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) visit(path);
          else if (entry.isFile()) {
            originals.set(path, hash(path));
            if (path.includes('/scripts/harness/') && path.endsWith('.ts')) sources.push(path);
          }
        }
      };
      visit(root);
      const require = createRequire(import.meta.url);
      const builder = createRequire(require.resolve('tsx/package.json'))('esbuild') as { build(options: Record<string, unknown>): Promise<unknown> };

      // Act: compile only this disposable package. No bundled dependency or path relocation.
      await builder.build({ entryPoints: sources, outbase: root, outdir: root, bundle: false, platform: 'node', format: 'esm', target: 'node18', sourcemap: true, logLevel: 'silent' });

      for (const [path, digest] of originals) expect(hash(path), path).toBe(digest);
      const metadata = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      metadata.files.push('scripts/harness/**/*.js', 'scripts/harness/**/*.js.map');
      writeFileSync(join(root, 'package.json'), JSON.stringify(metadata, null, 2));
      const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', resolve(destination), '--json'], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 });
      expect(packed.status, packed.stderr).toBe(0);
      const archive = JSON.parse(packed.stdout)[0];
      expect(archive.files).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'scripts/harness/main.ts' }),
        expect.objectContaining({ path: 'scripts/harness/main.js' }),
        expect.objectContaining({ path: 'bin/phasegate' }),
      ]));
      writeFileSync(join(destination, 'probe.json'), JSON.stringify({ input: resolve(input), inputSha256: hash(resolve(input)), archive: archive.filename,
        outputSha256: hash(join(destination, archive.filename)), sources: sources.length, node: process.version,
        scope: 'Prototype only; tsx-provided esbuild; original TS/bin/assets retained; distribution/runtime compatibility and hook performance require separate tests.' }, null, 2), { flag: 'wx' });
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120000);
});
