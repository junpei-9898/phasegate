// @layer test
/**
 * process.chdir() 依存テスト専用 — forks pool で実行
 * threads pool では process.chdir() が使えないため分離
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  test: {
    environment: 'node',
    include: [
      'integration/agent-integration/phase-gate-query-adapter-custom.integration.test.ts',
      'integration/config-foundation/file-system-config-repository.test.ts',
      'integration/nyquist-validation/adapter/file-system-matrix-file-adapter.it.test.ts',
    ],
    exclude: ['**/fixtures/**'],
    testTimeout: 15000,
    fileParallelism: false,
    pool: 'forks',
  },
});
