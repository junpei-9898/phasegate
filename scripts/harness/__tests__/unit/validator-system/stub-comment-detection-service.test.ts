/**
 * @layer test
 * @unit validator-system
 * @story H08-08
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { StubCommentDetectionService } from '../../../validator-system/domain/services/stub-comment-detection-service.js';

target('StubCommentDetectionService', () => {

  describe('detect()', () => {

    context('matchesが空のとき', () => {
      it('entries: []のレポートを返すこと (UT-VS-DS-SC-01)', () => {
        // Arrange
        const sut = new StubCommentDetectionService();
        // Act
        const actual = sut.detect([]);
        // Assert
        expect(actual.hasViolations()).toBe(false);
        expect(actual.entries).toHaveLength(0);
      });
    });

    context('matchesが1件のとき', () => {
      it('entries: [1件]のレポートを返すこと (UT-VS-DS-SC-02)', () => {
        // Arrange
        const sut = new StubCommentDetectionService();
        const matches = [{ filePath: 'adapter.ts', lineNumber: 10, lineContent: '  // stub実装: dummy' }];
        // Act
        const actual = sut.detect(matches);
        // Assert
        expect(actual.hasViolations()).toBe(true);
        expect(actual.entries).toHaveLength(1);
        expect(actual.entries[0].filePath).toBe('adapter.ts');
        expect(actual.entries[0].lineNumber).toBe(10);
      });
    });

    context('matchesが複数件のとき', () => {
      it('全matchesがentries化されること (UT-VS-DS-SC-03)', () => {
        // Arrange
        const sut = new StubCommentDetectionService();
        const matches = [
          { filePath: 'a.ts', lineNumber: 1, lineContent: '// stub実装:' },
          { filePath: 'b.ts', lineNumber: 5, lineContent: '// Stub implementation' },
        ];
        // Act
        const actual = sut.detect(matches);
        // Assert
        expect(actual.entries).toHaveLength(2);
      });
    });

  });

  describe('STUB_COMMENT_PATTERN', () => {

    it('パターンが"stub実装"にマッチすること (UT-VS-DS-SC-04)', () => {
      // Act & Assert
      expect(StubCommentDetectionService.STUB_COMMENT_PATTERN.test('// stub実装: TODO')).toBe(true);
    });

    it('パターンが"Stub implementation"にマッチすること', () => {
      // Act & Assert
      expect(StubCommentDetectionService.STUB_COMMENT_PATTERN.test('// Stub implementation')).toBe(true);
    });

    it('パターンが"STUB"にマッチすること', () => {
      // Act & Assert
      expect(StubCommentDetectionService.STUB_COMMENT_PATTERN.test('// STUB')).toBe(true);
    });

    it('通常コメントにはマッチしないこと', () => {
      // Act & Assert
      expect(StubCommentDetectionService.STUB_COMMENT_PATTERN.test('// normal comment')).toBe(false);
    });

  });

});
