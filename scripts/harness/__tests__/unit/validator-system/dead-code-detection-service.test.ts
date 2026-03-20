/**
 * @layer test
 * @unit validator-system
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { DeadCodeDetectionService } from '../../../validator-system/domain/services/l4/dead-code-detection-service.js';

const createMockSourceAnalysisPort = (overrides: Record<string, unknown> = {}) => ({
  getImportGraph: vi.fn().mockResolvedValue({
    unusedExports: [],
    unreachableCode: [],
  }),
  ...overrides,
});

target('DeadCodeDetectionService', () => {

  describe('detect() — DeadCodeReport生成', () => {

    it('未使用エクスポートが存在するImportGraphでunusedExportsに未使用エクスポートが含まれるDeadCodeReportが返ること (UT-DCD-001)', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: ['src/index.ts::unusedFn'],
          unreachableCode: [],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.unusedExports).toContain('src/index.ts::unusedFn');
    });

    it('到達不能コードが存在するソース解析結果でunreachableCodeに位置情報が含まれるDeadCodeReportが返ること (UT-DCD-002)', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: [],
          unreachableCode: [{ filePath: 'src/util.ts', range: { startLine: 10, endLine: 15 } }],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.unreachableCode).toHaveLength(1);
      expect(actual.unreachableCode[0].filePath).toBe('src/util.ts');
    });

    it('デッドコードなしの場合hasDeadCode() === falseのDeadCodeReportが返ること (UT-DCD-003)', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort();
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.hasDeadCode()).toBe(false);
    });

    it('strictOnly: trueかつデッドコードありの場合gcRecommended: trueのDeadCodeReportが返ること (UT-DCD-004)', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: ['src/index.ts::unusedFn'],
          unreachableCode: [],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: true });
      // Assert
      expect(actual.gcRecommended).toBe(true);
    });

    it('strictOnly: falseかつデッドコードありの場合gcRecommended: falseのDeadCodeReportが返ること (UT-DCD-005)', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: ['src/index.ts::unusedFn'],
          unreachableCode: [],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.gcRecommended).toBe(false);
    });
  });

  describe('detect() — ポートインタラクション', () => {

    it('detect()呼び出しでSourceAnalysisPortが呼び出されること（biome-ast-engineへの直接依存なし） (UT-DCD-006)', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort();
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      await sut.detect({ strictOnly: false });
      // Assert
      expect(mockPort.getImportGraph).toHaveBeenCalled();
    });

    context('SourceAnalysisPortがエラーをthrowする場合', () => {
      it('適切なエラーが伝播すること (UT-DCD-007)', async () => {
        // Arrange
        const mockPort = {
          getImportGraph: vi.fn().mockRejectedValue(new Error('Analysis error')),
        };
        const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
        // Act
        const actual = sut.detect({ strictOnly: false });
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});
