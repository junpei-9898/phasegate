import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { YamlHookConfigReaderAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/yaml-hook-config-reader-adapter.js';

let tmpDir = '';

target('YamlHookConfigReaderAdapter', () => {
  afterEach(async () => {
    if (tmpDir !== '') {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('IT-HF-022 JSON互換YAMLを読み込めること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
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
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isOk()).toBe(true);
  });
});
