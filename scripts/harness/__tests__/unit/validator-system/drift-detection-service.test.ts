/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { DriftDetectionService } from '../../../validator-system/domain/services/l4/drift-detection-service.js';

const createMockDesignDocumentPort = (elements: string[] = ['ValidatorId']) => ({
  getElements: vi.fn().mockResolvedValue(elements),
});

const createMockSourceCodeAnalyzerPort = (elements: string[] = ['ValidatorId']) => ({
  getElements: vi.fn().mockResolvedValue(elements),
});

target('DriftDetectionService', () => {

  describe('detect() — DriftReport生成', () => {

    it('設計文書に存在するがコードに存在しない要素がある場合direction: design→codeのDriftReportが生成されること (UT-DDS-001)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId', 'ValidatorDefinition']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId']);
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual.some(r => r.direction === 'design→code')).toBe(true);
    });

    it('コードに存在するが設計文書に存在しない要素がある場合direction: code→designのDriftReportが生成されること (UT-DDS-002)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId', 'ExtraClass']);
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual.some(r => r.direction === 'code→design')).toBe(true);
    });

    it('設計とコードが完全一致する場合空のDriftReport[]が返ること (UT-DDS-003)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId']);
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual).toEqual([]);
    });

    it('両方向で乖離がある場合両方向のDriftReportが返ること (UT-DDS-004)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId', 'DesignOnlyClass']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId', 'CodeOnlyClass']);
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual.some(r => r.direction === 'design→code')).toBe(true);
      expect(actual.some(r => r.direction === 'code→design')).toBe(true);
    });
  });

  describe('detect() — ポートインタラクション', () => {

    it('detect()呼び出しでDesignDocumentPortとSourceCodeAnalyzerPortが両方呼び出されること (UT-DDS-005)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort();
      const sourcePort = createMockSourceCodeAnalyzerPort();
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      await sut.detect();
      // Assert
      expect(designPort.getElements).toHaveBeenCalled();
      expect(sourcePort.getElements).toHaveBeenCalled();
    });

    context('DesignDocumentPortがエラーをthrowする場合', () => {
      it('適切なエラーが伝播すること (UT-DDS-006)', async () => {
        // Arrange
        const designPort = {
          getElements: vi.fn().mockRejectedValue(new Error('DesignDoc read error')),
        };
        const sourcePort = createMockSourceCodeAnalyzerPort();
        const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
        // Act
        const actual = sut.detect();
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});
