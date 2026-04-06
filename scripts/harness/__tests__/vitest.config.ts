// @layer test
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: [
      '**/fixtures/**',
      // process.chdir() 依存テストは vitest.config.forks.ts で forks pool 実行
      'integration/agent-integration/phase-gate-query-adapter-custom.integration.test.ts',
      'integration/config-foundation/file-system-config-repository.test.ts',
      'integration/nyquist-validation/adapter/file-system-matrix-file-adapter.it.test.ts',
    ],
    testTimeout: 15000,
    fileParallelism: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
