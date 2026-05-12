// @layer test
// @unit phase2-extensions
// @story HF2-02
// @work-item-id WI-122
import { expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import {
  createFilePathPointer,
  createPointerRule,
  createUrlPointer,
} from '../../helpers/phase2-extensions-test-factories.js';
import { ValidateDocPointersUseCase } from '../../../phase2-extensions/application/usecases/validate-doc-pointers-usecase.js';
import { PointerResolutionService } from '../../../phase2-extensions/domain/services/pointer-resolution-service.js';

target('IT-P2-002 ValidateDocPointersUseCase', () => {
  function arrangeUseCase(options: {
    readonly pointerRules?: readonly ReturnType<typeof createPointerRule>[];
    readonly pointers?: readonly ReturnType<typeof createFilePathPointer>[];
    readonly resolvesTo?: boolean;
  } = {}): ValidateDocPointersUseCase {
    const freshnessConfigPort = {
      loadRules: vi.fn(),
      loadPointerRules: vi.fn().mockResolvedValue(options.pointerRules ?? [createPointerRule()]),
    };
    const documentScannerPort = { scan: vi.fn().mockResolvedValue(['docs/design.md']) };
    const pointerExtractorPort = { extract: vi.fn().mockResolvedValue(options.pointers ?? [createFilePathPointer()]) };
    const pointerResolverPort = { resolve: vi.fn().mockResolvedValue(options.resolvesTo ?? true) };
    return new ValidateDocPointersUseCase(
      freshnessConfigPort,
      documentScannerPort,
      pointerExtractorPort,
      new PointerResolutionService(pointerResolverPort),
    );
  }

  context('execute()', () => {
    it('全ポインタが実在する場合に passed=true が返る', async () => {
      // Arrange
      const useCase = arrangeUseCase();
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.summary.brokenPointers).toBe(0);
    });

    it('broken Pointer が1件ある場合に passed=false が返る', async () => {
      // Arrange
      const useCase = arrangeUseCase({ resolvesTo: false });
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.summary.brokenPointers).toBe(1);
    });

    it('URL ポインタはスキップされ summary.skippedUrlPointers にカウントされる', async () => {
      // Arrange
      const useCase = arrangeUseCase({ pointers: [createUrlPointer()] });
      // Act
      const actual = await useCase.execute({ includeUrlPointers: true });
      // Assert
      expect(actual.summary.skippedUrlPointers).toBe(1);
      expect(actual.passed).toBe(true);
    });

    it('failOnBroken=false のルールでは broken Pointer 検出時も passed=true になる', async () => {
      // Arrange
      const useCase = arrangeUseCase({
        pointerRules: [createPointerRule({ failOnBroken: false })],
        resolvesTo: false,
      });
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.summary.brokenPointers).toBe(1);
    });

    it('broken Pointer report に owner / semanticPointerType / nextAction が含まれる', async () => {
      // Arrange
      const useCase = arrangeUseCase({
        pointerRules: [createPointerRule({ owner: 'docs-team', pointerPolicies: { 'product-doc': 'fail' } })],
        pointers: [createFilePathPointer({ target: 'docs/product/construction/validator-system/logical_design.md' })],
        resolvesTo: false,
      });
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results[0]).toMatchObject({
        owner: 'docs-team',
        semanticPointerType: 'product-doc',
        severity: 'fail',
        nextAction: 'Fix product-doc pointer or change policy for owner docs-team',
      });
      expect(actual.passed).toBe(false);
    });
  });
});
