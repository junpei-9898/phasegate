// @layer test
import { beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import {
  createFilePathPointer,
  createPointerRule,
  createUrlPointer,
} from '../../helpers/phase2-extensions-test-factories.js';
import { ValidateDocPointersUseCase } from '../../../phase2-extensions/application/usecases/validate-doc-pointers-usecase.js';
import { PointerResolutionService } from '../../../phase2-extensions/domain/services/pointer-resolution-service.js';

target('IT-P2-002 ValidateDocPointersUseCase', () => {
  let freshnessConfigPort: { loadRules: ReturnType<typeof vi.fn>; loadPointerRules: ReturnType<typeof vi.fn> };
  let documentScannerPort: { scan: ReturnType<typeof vi.fn> };
  let pointerExtractorPort: { extract: ReturnType<typeof vi.fn> };
  let pointerResolverPort: { resolve: ReturnType<typeof vi.fn> };
  let useCase: ValidateDocPointersUseCase;

  beforeEach(() => {
    freshnessConfigPort = {
      loadRules: vi.fn(),
      loadPointerRules: vi.fn().mockResolvedValue([createPointerRule()]),
    };
    documentScannerPort = { scan: vi.fn().mockResolvedValue(['docs/design.md']) };
    pointerExtractorPort = { extract: vi.fn().mockResolvedValue([createFilePathPointer()]) };
    pointerResolverPort = { resolve: vi.fn().mockResolvedValue(true) };
    useCase = new ValidateDocPointersUseCase(
      freshnessConfigPort,
      documentScannerPort,
      pointerExtractorPort,
      new PointerResolutionService(pointerResolverPort),
    );
  });

  context('execute()', () => {
    it('全ポインタが実在する場合に passed=true が返る', async () => {
      // Arrange / Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.summary.brokenPointers).toBe(0);
    });

    it('broken Pointer が1件ある場合に passed=false が返る', async () => {
      // Arrange
      pointerResolverPort.resolve.mockResolvedValue(false);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.summary.brokenPointers).toBe(1);
    });

    it('URL ポインタはスキップされ summary.skippedUrlPointers にカウントされる', async () => {
      // Arrange
      pointerExtractorPort.extract.mockResolvedValue([createUrlPointer()]);
      // Act
      const actual = await useCase.execute({ includeUrlPointers: true });
      // Assert
      expect(actual.summary.skippedUrlPointers).toBe(1);
      expect(actual.passed).toBe(true);
    });

    it('failOnBroken=false のルールでは broken Pointer 検出時も passed=true になる', async () => {
      // Arrange
      freshnessConfigPort.loadPointerRules.mockResolvedValue([createPointerRule({ failOnBroken: false })]);
      pointerResolverPort.resolve.mockResolvedValue(false);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.summary.brokenPointers).toBe(1);
    });
  });
});
