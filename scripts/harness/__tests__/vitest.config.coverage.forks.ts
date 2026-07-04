// @layer test
/**
 * カバレッジ計測専用 config（forks pool / process.chdir() 依存テスト）
 * --reporter=blob で blob レポートを出力し、threads 側とマージする。
 * 除外リスト（分母補正）の根拠は coverage-exclude.ts を参照。
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { L3_003_COVERAGE_EXCLUDE } from './coverage-exclude.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

export default defineConfig({
  root: repoRoot,
  test: {
    environment: 'node',
    include: [
      'scripts/harness/__tests__/integration/agent-integration/phase-gate-query-adapter-custom.integration.test.ts',
      'scripts/harness/__tests__/integration/config-foundation/file-system-config-repository.test.ts',
      'scripts/harness/__tests__/integration/nyquist-validation/adapter/file-system-matrix-file-adapter.it.test.ts',
    ],
    exclude: ['**/fixtures/**'],
    testTimeout: 15000,
    fileParallelism: false,
    pool: 'forks',
    coverage: {
      enabled: true,
      provider: 'v8',
      all: true,
      include: ['scripts/harness/**/*.ts'],
      exclude: [...L3_003_COVERAGE_EXCLUDE],
      reporter: ['json-summary', 'json'],
      reportsDirectory: path.resolve(repoRoot, 'coverage'),
    },
  },
});
