// @story H11-01
// @unit harness-api
// @layer e2e-test
// @work-item-id WI-220
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const builder = fileURLToPath(new URL('../../../pack-runtime.mjs', import.meta.url));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'phasegate-runtime-pack-test-'));
  const source = join(root, 'source');
  const output = join(root, 'output');
  mkdirSync(join(source, 'scripts/harness'), { recursive: true });
  mkdirSync(join(source, 'bin'));
  mkdirSync(output);
  writeFileSync(join(source, 'package.json'), JSON.stringify({ name: 'phasegate-pack-fixture', version: '1.0.0', type: 'module', files: ['scripts/harness/**/*.ts', 'scripts/harness/**/*.json', 'bin/phasegate'] }));
  writeFileSync(join(source, 'scripts/harness/main.ts'), 'const message: string = "runtime-ok"; console.log(message);\n');
  writeFileSync(join(source, 'scripts/harness/schema.json'), '{"fixture":true}\n');
  writeFileSync(join(source, 'bin/phasegate'), '#!/bin/sh\n# preserved entry\n');
  return { root, source, output };
}

describe('既存入口を保持する配布物生成', () => {
  it('隔離した生成物を直接実行でき元ファイルとcheckoutを保持すること', () => {
    const f = fixture();
    try {
      const actual = spawnSync(process.execPath, [builder, '--pack-destination', f.output], { cwd: f.source, encoding: 'utf8' });
      expect(actual.status, actual.stderr).toBe(0);
      const packed = JSON.parse(actual.stdout)[0];
      const extracted = join(f.root, 'extracted');
      mkdirSync(extracted);
      expect(spawnSync('tar', ['-xzf', join(f.output, packed.filename), '-C', extracted, '--strip-components=1']).status).toBe(0);
      for (const path of ['scripts/harness/main.ts', 'scripts/harness/schema.json', 'bin/phasegate']) {
        expect(readFileSync(join(extracted, path))).toEqual(readFileSync(join(f.source, path)));
      }
      expect(existsSync(join(extracted, 'scripts/harness/main.js.map'))).toBe(true);
      expect(existsSync(join(f.source, 'scripts/harness/main.js'))).toBe(false);
      const executed = spawnSync(process.execPath, [join(extracted, 'scripts/harness/main.js')], { encoding: 'utf8' });
      expect(executed.status, executed.stderr).toBe(0);
      expect(executed.stdout).toBe('runtime-ok\n');

      const before = readFileSync(join(f.output, packed.filename));
      const repeated = spawnSync(process.execPath, [builder, '--pack-destination', f.output], { cwd: f.source, encoding: 'utf8' });
      expect(repeated.status).toBe(1);
      expect(repeated.stderr).toContain('already exists');
      expect(readFileSync(join(f.output, packed.filename))).toEqual(before);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  }, 60000);

  it('構文エラーを成功配布物へ変換せず生成先を空のまま保持すること', () => {
    const f = fixture();
    try {
      writeFileSync(join(f.source, 'scripts/harness/main.ts'), 'const value: = ;');
      const actual = spawnSync(process.execPath, [builder, '--pack-destination', resolve(f.output)], { cwd: f.source, encoding: 'utf8' });
      expect(actual.status).toBe(1);
      expect(actual.stderr).toContain('TypeScript');
      expect(readdirSync(f.output)).toEqual([]);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  }, 60000);
});
