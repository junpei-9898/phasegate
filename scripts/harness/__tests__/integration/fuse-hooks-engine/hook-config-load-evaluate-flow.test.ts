import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { LoadHookConfigUseCase } from '../../../fuse-hooks-engine/application/usecases/load-hook-config-usecase.js';
import { EvaluateHookEventUseCase } from '../../../fuse-hooks-engine/application/usecases/evaluate-hook-event-usecase.js';
import { HookEvaluationService } from '../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';
import { YamlHookConfigReaderAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/yaml-hook-config-reader-adapter.js';

let tmpDir = '';

target('フック設定ロード→評価統合フロー', () => {
  afterEach(async () => {
    if (tmpDir !== '') {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('IT-HF-032 ロードした定義でwriteイベントをブロックできること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-flow-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    await fs.writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        hooks: [
          {
            type: 'pre-write',
            files: { include: ['**/*.env'] },
            action: { type: 'block-write', config: { reason: 'Protected', notifyUser: true } },
          },
        ],
      }),
      'utf8',
    );
    const reader = new YamlHookConfigReaderAdapter();
    const loadUseCase = new LoadHookConfigUseCase(reader, new HookEvaluationService());
    const evaluateUseCase = new EvaluateHookEventUseCase(
      { handlePreWrite: async () => null, handlePreRead: async () => null },
      { execute: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
      new HookEvaluationService(),
    );
    const loaded = await loadUseCase.execute({ yamlPath: filePath });
    // Act
    const actual = await evaluateUseCase.execute({
      filePath: '.env',
      eventType: 'write',
      mountStatus: 'mounted',
      definitions: loaded.definitions,
    });
    // Assert
    expect(actual.blocked).toBe(true);
  });
});
