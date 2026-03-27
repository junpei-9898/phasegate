import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { createCompletionGate, createMagicFile } from '../../unit/fuse-hooks-engine/factories.js';
import { CompletionGateFileAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/completion-gate-file-adapter.js';
import { CompletionGate } from '../../../fuse-hooks-engine/domain/entities/completion-gate.js';

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
    expect(actual?.storyId).toBe('HF1-05');
  });

  it('IT-HF-045 存在しないstoryIdでloadするとnullが返されること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-gate-'));
    const sut = new CompletionGateFileAdapter(tmpDir);
    // Act
    const actual = await sut.load('NONEXISTENT-ID');
    // Assert
    expect(actual).toBeNull();
  });

  context('テスト実行', () => {
    it('IT-HF-040 runTestsがテストコマンドを実行して結果を返すこと', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-gate-'));
      const sut = new CompletionGateFileAdapter(tmpDir, {
        testCommand: 'echo "tests passed"',
      });
      // Act
      const result = await sut.runTests();
      // Assert
      expect(result.passed).toBe(true);
      expect(result.stdout).toContain('tests passed');
    });

    it('IT-HF-041 テスト失敗時にpassed=falseが返されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-gate-'));
      const sut = new CompletionGateFileAdapter(tmpDir, {
        testCommand: 'exit 1',
      });
      // Act
      const result = await sut.runTests();
      // Assert
      expect(result.passed).toBe(false);
    });

    it('IT-HF-042 テスト未通過時にevaluateMagicFileがfailを返すこと', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-gate-'));
      // Magic file は存在するが、テストが通らない
      const magicFile = createMagicFile({ filePath: '.harness/done/test.done', requiredFields: [] });
      const gate = CompletionGate.create('TEST-01', magicFile);
      const magicFilePath = path.join(tmpDir, '.harness/done/test.done');
      await fs.mkdir(path.dirname(magicFilePath), { recursive: true });
      await fs.writeFile(magicFilePath, '{}', 'utf8');

      const sut = new CompletionGateFileAdapter(tmpDir, {
        testCommand: 'exit 1',
        requireTestPass: true,
      });
      // Act
      const result = await sut.evaluateMagicFile(gate);
      // Assert
      expect(result.passed).toBe(false);
      expect(result.failureReason).toMatch(/test/i);
    });

    it('IT-HF-043 テスト通過時にevaluateMagicFileがpassを返すこと', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-gate-'));
      const magicFile = createMagicFile({ filePath: '.harness/done/test.done', requiredFields: [] });
      const gate = CompletionGate.create('TEST-02', magicFile);
      const magicFilePath = path.join(tmpDir, '.harness/done/test.done');
      await fs.mkdir(path.dirname(magicFilePath), { recursive: true });
      await fs.writeFile(magicFilePath, '{}', 'utf8');

      const sut = new CompletionGateFileAdapter(tmpDir, {
        testCommand: 'echo "all passed"',
        requireTestPass: true,
      });
      // Act
      const result = await sut.evaluateMagicFile(gate);
      // Assert
      expect(result.passed).toBe(true);
    });
  });

  context('CommandRegistry統合', () => {
    it('IT-HF-044 getCommandEntryがharness:completeコマンド情報を返すこと', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-gate-'));
      const sut = new CompletionGateFileAdapter(tmpDir);
      // Act
      const entry = sut.getCommandEntry();
      // Assert
      expect(entry.name).toBe('harness:complete');
      expect(entry.description).toBeTruthy();
    });
  });
});
