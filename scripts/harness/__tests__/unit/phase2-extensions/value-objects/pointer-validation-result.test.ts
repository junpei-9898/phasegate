// @layer test
import { expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { createFilePathPointer, createUrlPointer } from '../../../helpers/phase2-extensions-test-factories.js';
import { PointerValidationResult } from '../../../../phase2-extensions/domain/value-objects/pointer-validation-result.js';

target('UT-P2-004 PointerValidationResult', () => {
  context('factory methods', () => {
    it('resolved() は isResolvable=true のインスタンスを生成する', () => {
      // Arrange
      const pointer = createFilePathPointer();
      // Act
      const actual = PointerValidationResult.resolved(pointer, 'docs/design.md');
      // Assert
      expect(actual.isResolvable).toBe(true);
      expect(actual.errorMessage).toBeNull();
    });

    it('broken() は isResolvable=false のインスタンスを生成する', () => {
      // Arrange
      const pointer = createFilePathPointer();
      // Act
      const actual = PointerValidationResult.broken(pointer, 'File not found: docs/missing.md');
      // Assert
      expect(actual.isResolvable).toBe(false);
      expect(actual.resolvedPath).toBeNull();
    });

    it('skipped() は URL スキップ結果を生成する', () => {
      // Arrange
      const pointer = createUrlPointer();
      // Act
      const actual = PointerValidationResult.skipped(pointer);
      // Assert
      expect(actual.isResolvable).toBe(true);
      expect(actual.errorMessage).toBeNull();
    });
  });
});
