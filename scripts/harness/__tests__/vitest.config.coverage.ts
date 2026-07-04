// @layer test
/**
 * カバレッジ計測専用 config（threads pool / 大半のテスト）
 * root をリポジトリルートに置き、SOURCE ファイル（scripts/harness/**）を
 * 分母に含めて真のカバレッジを算出する。
 * forks pool 側は vitest.config.coverage.forks.ts で計測し、
 * blob レポートを --merge-reports でマージして json-summary を生成する。
 *
 * 実行フロー（package.json の coverage スクリプト参照）:
 *   1. 本 config を --reporter=blob で実行 → coverage/.blob/threads.json
 *   2. forks config を --reporter=blob で実行 → coverage/.blob/forks.json
 *   3. 本 config を --merge-reports=coverage/.blob で実行
 *      → coverage/coverage-summary.json（L3-003 が読む json-summary）
 *
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
    include: ['scripts/harness/__tests__/**/*.test.ts'],
    exclude: [
      '**/fixtures/**',
      // e2e は tsx サブプロセスで別プロセス実行され in-process カバレッジに寄与しない。
      // かつ ci-check e2e はこの coverage-summary.json に依存するため計測時は除外（循環回避）。
      'scripts/harness/__tests__/e2e/**',
      // process.chdir() 依存テストは forks pool 側 config で計測する
      'scripts/harness/__tests__/integration/agent-integration/phase-gate-query-adapter-custom.integration.test.ts',
      'scripts/harness/__tests__/integration/config-foundation/file-system-config-repository.test.ts',
      'scripts/harness/__tests__/integration/nyquist-validation/adapter/file-system-matrix-file-adapter.it.test.ts',
    ],
    testTimeout: 15000,
    fileParallelism: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
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
