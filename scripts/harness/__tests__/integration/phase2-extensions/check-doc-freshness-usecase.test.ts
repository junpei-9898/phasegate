import { beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { createDocFreshnessRule } from '../../helpers/phase2-extensions-test-factories.js';
import { CheckDocFreshnessUseCase } from '../../../phase2-extensions/application/usecases/check-doc-freshness-usecase.js';
import { FreshnessCheckService } from '../../../phase2-extensions/domain/services/freshness-check-service.js';
import { DocumentAge } from '../../../phase2-extensions/domain/value-objects/document-age.js';

target('IT-P2-001 CheckDocFreshnessUseCase', () => {
  let freshnessConfigPort: { loadRules: ReturnType<typeof vi.fn>; loadPointerRules: ReturnType<typeof vi.fn> };
  let documentScannerPort: { scan: ReturnType<typeof vi.fn> };
  let documentAgePort: { getAge: ReturnType<typeof vi.fn> };
  let useCase: CheckDocFreshnessUseCase;

  beforeEach(() => {
    freshnessConfigPort = {
      loadRules: vi.fn().mockResolvedValue([createDocFreshnessRule()]),
      loadPointerRules: vi.fn().mockResolvedValue([]),
    };
    documentScannerPort = { scan: vi.fn().mockResolvedValue(['docs/design.md']) };
    documentAgePort = { getAge: vi.fn().mockResolvedValue(DocumentAge.create({ ageInDays: 5, source: 'git-log' })) };
    useCase = new CheckDocFreshnessUseCase(
      freshnessConfigPort,
      documentScannerPort,
      documentAgePort,
      new FreshnessCheckService(),
    );
  });

  context('execute()', () => {
    it('ドキュメントが鮮度OKのとき level="ok" が返る', async () => {
      // Arrange / Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results).toHaveLength(1);
      expect(actual.results[0].level).toBe('ok');
      expect(actual.summary.ok).toBe(1);
    });

    it('ageInDays=60 のとき level="error" が返る', async () => {
      // Arrange
      documentAgePort.getAge.mockResolvedValue(DocumentAge.create({ ageInDays: 60, source: 'file-mtime' }));
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results[0].level).toBe('error');
    });

    it('enabled=false のルールに対して DocumentScannerPort が呼び出されない', async () => {
      // Arrange
      freshnessConfigPort.loadRules.mockResolvedValue([createDocFreshnessRule({ enabled: false })]);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(documentScannerPort.scan).not.toHaveBeenCalled();
      expect(actual.results).toHaveLength(0);
    });
  });
});
