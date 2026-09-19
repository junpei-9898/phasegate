// @story H11-01
// @unit harness-api
// @layer e2e-test
// @work-item-id WI-220
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { withTempDir } from './cli-test-helpers.js';

const main = resolve(dirname(fileURLToPath(import.meta.url)), '../../main.ts');
const tsx = createRequire(import.meta.url).resolve('tsx');

function runWithUnusedModulesDenied(cwd: string, args: string[]) {
  const loaderPath = join(cwd, 'deny-unused.mjs');
  writeFileSync(loaderPath, `
export async function resolve(specifier, context, next) {
  if (/(ci-governance|regression-suite|phase2-extensions|skill-quality|validator-system|world-model|installation|quick-mode|phase-dependency-model|traceability-model|adr-foundation|harness-error)\\/(composition-root|index)\\.(js|ts)$/.test(specifier)) {
    throw new Error('PG_TEST_UNUSED_COMMAND_MODULE: ' + specifier);
  }
  return next(specifier, context);
}
`);
  const registration = `data:text/javascript,${encodeURIComponent(`import { register } from 'node:module'; register(${JSON.stringify(pathToFileURL(loaderPath).href)});`)}`;
  const actual = spawnSync(process.execPath, ['--import', tsx, '--import', registration, main, ...args], {
    cwd, encoding: 'utf8', timeout: 15000, env: { ...process.env, NODE_ENV: 'test' },
  });
  if (actual.error) throw actual.error;
  return { exitCode: actual.status, stdout: actual.stdout, stderr: actual.stderr };
}

describe('公開CLIのコマンド依存分離', () => {
  it('helpは実行しないコマンド用moduleを読み込まず利用できること', () => {
    const actual = withTempDir((cwd) => runWithUnusedModulesDenied(cwd, ['--help']));
    expect(actual.exitCode, actual.stderr).toBe(0);
    expect(actual.stdout).toContain('phasegate');
  });

  it('lintは無関係moduleが読めなくても実ファイルの診断を返すこと', () => {
    const actual = withTempDir((cwd) => {
      mkdirSync(join(cwd, 'scripts/harness/sample'), { recursive: true });
      writeFileSync(join(cwd, 'scripts/harness/sample/a.ts'), 'export const value = 1;\n');
      return runWithUnusedModulesDenied(cwd, ['phasegate:lint', '--json']);
    });
    expect(actual.exitCode, actual.stderr).toBe(1);
    expect(JSON.parse(actual.stdout)).toMatchObject({
      status: 'fail',
      errors: expect.arrayContaining([expect.objectContaining({ code: 'require-layer-comment', severity: 'error' })]),
    });
    expect(actual.stderr).not.toContain('PG_TEST_UNUSED_COMMAND_MODULE');
  });

  it('選択コマンドが必要とするmoduleの読込失敗を成功にしないこと', () => {
    const actual = withTempDir((cwd) => runWithUnusedModulesDenied(cwd, ['world:inspect', '--json']));
    expect(actual.exitCode).not.toBe(0);
    expect(actual.stderr).toContain('PG_TEST_UNUSED_COMMAND_MODULE: ./world-model/index.js');
  });
});
