/**
 * @layer test
 * @unit validator-system
 * @story H08-07
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ItTestMockDetectionService } from '../../../validator-system/domain/services/it-test-mock-detection-service.js';

target('ItTestMockDetectionService', () => {

  describe('detect()', () => {

    context('mockCallsが空のとき', () => {
      it('violations: []のレポートを返すこと (UT-VS-DS-IM-01)', () => {
        // Arrange
        const sut = new ItTestMockDetectionService();
        // Act
        const actual = sut.detect([]);
        // Assert
        expect(actual.hasViolations()).toBe(false);
        expect(actual.violations).toHaveLength(0);
      });
    });

    context('外部モジュール（node:fs）のみmockしている場合', () => {
      it('違反を検出しないこと (UT-VS-DS-IM-02)', () => {
        // Arrange
        const sut = new ItTestMockDetectionService();
        const mockCalls = [
          { filePath: 'test.ts', mockedModule: 'node:fs' },
          { filePath: 'test.ts', mockedModule: 'vitest' },
        ];
        // Act
        const actual = sut.detect(mockCalls);
        // Assert
        expect(actual.hasViolations()).toBe(false);
      });
    });

    context('内部モジュール（./serviceなど）をmockしている場合', () => {
      it('違反を1件検出すること (UT-VS-DS-IM-03)', () => {
        // Arrange
        const sut = new ItTestMockDetectionService();
        const mockCalls = [
          { filePath: 'it-test.ts', mockedModule: './internal-service' },
        ];
        // Act
        const actual = sut.detect(mockCalls);
        // Assert
        expect(actual.hasViolations()).toBe(true);
        expect(actual.violations).toHaveLength(1);
        expect(actual.violations[0].filePath).toBe('it-test.ts');
      });
    });

    context('同一ファイルで内部モジュールを複数mockしている場合', () => {
      it('同一ファイルの違反が1エントリにまとめられること (UT-VS-DS-IM-04)', () => {
        // Arrange
        const sut = new ItTestMockDetectionService();
        const mockCalls = [
          { filePath: 'it-test.ts', mockedModule: './service-a' },
          { filePath: 'it-test.ts', mockedModule: './service-b' },
          { filePath: 'other-test.ts', mockedModule: '../repo' },
        ];
        // Act
        const actual = sut.detect(mockCalls);
        // Assert
        expect(actual.violations).toHaveLength(2);
        const entry = actual.violations.find((v) => v.filePath === 'it-test.ts');
        expect(entry?.mockedModules).toHaveLength(2);
      });
    });

  });

});
