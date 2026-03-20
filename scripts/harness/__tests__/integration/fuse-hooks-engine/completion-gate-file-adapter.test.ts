import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { createCompletionGate } from '../../unit/fuse-hooks-engine/factories.js';
import { CompletionGateFileAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/completion-gate-file-adapter.js';

let tmpDir = '';

target('CompletionGateFileAdapter', () => {
  afterEach(async () => {
    if (tmpDir !== '') {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('IT-HF-026 save後にloadできること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-gate-'));
    const sut = new CompletionGateFileAdapter(tmpDir);
    const gate = createCompletionGate();
    gate.startCheck();
    gate.fail('missing');
    await sut.save(gate);
    // Act
    const actual = await sut.load('HF1-05');
    // Assert
    expect(actual?.status).toBe('failed');
  });
});
