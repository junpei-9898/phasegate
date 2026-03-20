import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { CheckCompletionGateUseCase } from '../../../fuse-hooks-engine/application/usecases/check-completion-gate-usecase.js';
import { CompletionGateFileAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/completion-gate-file-adapter.js';

let tmpDir = '';

target('CheckCompletionGateUseCase', () => {
  afterEach(async () => {
    if (tmpDir !== '') {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('IT-HF-013 マジックファイルが存在するとpassedが返ること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-engine-'));
    await fs.mkdir(path.join(tmpDir, '.harness', 'done'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.harness', 'done', 'HF1-05.done'),
      JSON.stringify({ status: 'done' }),
      'utf8',
    );
    const sut = new CheckCompletionGateUseCase(new CompletionGateFileAdapter(tmpDir));
    // Act
    const actual = await sut.execute({
      storyId: 'HF1-05',
      magicFilePath: '.harness/done/HF1-05.done',
      requiredFields: ['status'],
    });
    // Assert
    expect(actual.gateStatus).toBe('passed');
    expect(actual.errors).toHaveLength(0);
  });
});
