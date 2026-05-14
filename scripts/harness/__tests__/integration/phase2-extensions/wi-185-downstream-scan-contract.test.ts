// @layer test
// @unit phase2-extensions
// @story HF2-01
// @work-item-id WI-185
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { CheckDocFreshnessUseCase } from '../../../phase2-extensions/application/usecases/check-doc-freshness-usecase.js';
import { ValidateDocPointersUseCase } from '../../../phase2-extensions/application/usecases/validate-doc-pointers-usecase.js';
import { DocFreshnessRule } from '../../../phase2-extensions/domain/aggregates/doc-freshness-rule.js';
import { PointerRule } from '../../../phase2-extensions/domain/aggregates/pointer-rule.js';
import { FreshnessCheckService } from '../../../phase2-extensions/domain/services/freshness-check-service.js';
import { PointerResolutionService } from '../../../phase2-extensions/domain/services/pointer-resolution-service.js';
import { DocumentAge } from '../../../phase2-extensions/domain/value-objects/document-age.js';
import { FreshnessThreshold } from '../../../phase2-extensions/domain/value-objects/freshness-threshold.js';
import { Pointer } from '../../../phase2-extensions/domain/value-objects/pointer.js';
import { FileSystemDocumentScannerAdapter } from '../../../phase2-extensions/infrastructure/adapters/file-system-document-scanner-adapter.js';
import { HarnessConfigFreshnessAdapter } from '../../../phase2-extensions/infrastructure/adapters/harness-config-freshness-adapter.js';
import { ValidatePointersHandler } from '../../../phase2-extensions/presentation/handlers/validate-pointers-handler.js';

class RecordingScanner {
  async scan(pattern: string): Promise<string[]> {
    return [pattern];
  }
}

const freshnessRule = DocFreshnessRule.create({
  ruleId: 'docs',
  documentPattern: 'docs/**/*.md',
  threshold: FreshnessThreshold.create({ warnThresholdDays: 30, errorThresholdDays: 90 }),
  enabled: true,
});

const pointerRule = PointerRule.create({
  ruleId: 'pointers',
  documentPattern: 'docs/**/*.md',
  failOnBroken: true,
});

async function createSingleFileFixture(root: string): Promise<void> {
  await fs.mkdir(path.join(root, 'docs/sub'), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(root, 'docs/sub/doc1.md'), '# doc1\n'),
    fs.writeFile(path.join(root, 'docs/sub/doc2.md'), '# doc2\n'),
  ]);
}

target('WI-185 downstream scan contract', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phasegate-wi185-'));
    await createSingleFileFixture(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('default rules', () => {
    it('既定 freshness と pointer pattern が downstream docs 全体を指すこと', async () => {
      // Arrange
      const adapter = new HarnessConfigFreshnessAdapter();

      // Act
      const actual = await Promise.all([adapter.loadRules(), adapter.loadPointerRules()]);

      // Assert
      expect(actual.map((rules) => rules[0].documentPattern)).toEqual(['docs/**/*.md', 'docs/**/*.md']);
    });
  });

  context('freshness explicit pattern', () => {
    it('明示 pattern はルール選別ではなく scan pattern として使われること', async () => {
      // Arrange
      const scanner = new RecordingScanner();
      const useCase = new CheckDocFreshnessUseCase(
        { loadRules: async () => [freshnessRule], loadPointerRules: async () => [] },
        scanner,
        { getAge: async () => DocumentAge.create({ ageInDays: 0, source: 'file-mtime' }) },
        new FreshnessCheckService(),
      );

      // Act
      const actual = await useCase.execute({ targetPattern: 'docs/sub/doc1.md' });

      // Assert
      expect(actual).toEqual({
        errors: [],
        results: [
          {
            ruleId: 'docs',
            documentPath: 'docs/sub/doc1.md',
            ageInDays: 0,
            ageSource: 'file-mtime',
            category: 'stable',
            level: 'ok',
            message: 'docs/sub/doc1.md is 0 days old',
            nextAction: 'no action required',
          },
        ],
        summary: { total: 1, ok: 1, warn: 0, error: 0 },
      });
    });
  });

  context('pointer explicit pattern', () => {
    it('handler の --pattern は pointer scan pattern として使われること', async () => {
      // Arrange
      const scanner = new RecordingScanner();
      const useCase = new ValidateDocPointersUseCase(
        { loadRules: async () => [], loadPointerRules: async () => [pointerRule] },
        scanner,
        { extract: async () => [Pointer.create({ type: 'file-path', rawText: 'docs/sub/doc1.md', target: 'docs/sub/doc1.md' })] },
        new PointerResolutionService({ resolve: async () => true }),
      );
      const handler = new ValidatePointersHandler(useCase);

      // Act
      const actual = await handler.handle(['--pattern', 'docs/sub/doc1.md', '--format', 'json']);

      // Assert
      expect(actual).toEqual({
        exitCode: 0,
        stdout: JSON.stringify({
          results: [
            {
              documentPath: 'docs/sub/doc1.md',
              pointerTarget: 'docs/sub/doc1.md',
              pointerType: 'file-path',
              semanticPointerType: 'reference',
              owner: 'unowned',
              severity: 'fail',
              isResolvable: true,
              errorMessage: null,
              nextAction: 'no action required',
            },
          ],
          summary: { totalDocuments: 1, totalPointers: 1, brokenPointers: 0, skippedUrlPointers: 0 },
          passed: true,
          errors: [],
        }, null, 2),
      });
    });
  });

  context('single-file scanner pattern', () => {
    it('単一ファイル path を pattern として指定すると対象ファイルだけが返ること', async () => {
      // Arrange
      const scanner = new FileSystemDocumentScannerAdapter(tmpDir);

      // Act
      const actual = await scanner.scan('docs/sub/doc1.md');

      // Assert
      expect(actual).toEqual(['docs/sub/doc1.md']);
    });
  });
});
