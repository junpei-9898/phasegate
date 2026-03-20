import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { GenerateE2ETemplateHandler } from '../../../phase2-extensions/presentation/handlers/generate-e2e-template-handler.js';

target('IT-P2-010 GenerateE2ETemplateHandler', () => {
  let tmpDir: string;
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: GenerateE2ETemplateHandler;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase2-ext-handler-'));
    useCaseMock = { execute: vi.fn() };
    handler = new GenerateE2ETemplateHandler(useCaseMock as never);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('handle(args)', () => {
    it('--phase=wave1 で正常生成し exitCode=0 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        templateContent: '# E2Eテスト戦略: wave1\n',
        targetPhase: 'wave1',
        generatedAt: '2026-03-20T00:00:00.000Z',
        outputPath: null,
        errors: [],
      });
      // Act
      const actual = await handler.handle(['--phase', 'wave1']);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('wave1');
    });

    it('--output 指定時にファイルが書き出される', async () => {
      // Arrange
      const outputPath = path.join(tmpDir, 'e2e.md');
      useCaseMock.execute.mockResolvedValue({
        templateContent: '# E2Eテスト戦略: phase2\n',
        targetPhase: 'phase2',
        generatedAt: '2026-03-20T00:00:00.000Z',
        outputPath,
        errors: [],
      });
      // Act
      const actual = await handler.handle(['--phase', 'phase2', '--output', outputPath]);
      // Assert
      const written = await fs.readFile(outputPath, 'utf8');
      expect(actual.exitCode).toBe(0);
      expect(written).toContain('phase2');
    });
  });
});
