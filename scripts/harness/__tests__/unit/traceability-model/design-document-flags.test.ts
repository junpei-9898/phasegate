// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { DesignDocumentFlags } from '../../../traceability-model/domain/value-objects/design-document-flags.ts';

const createDesignDocumentFlags = (initialCreation = false) =>
  DesignDocumentFlags.create(Object.freeze({ initialCreation }));

target('DesignDocumentFlags.requiresStoryIdAnnotation', () => {
  describe('story-id注釈の必須判定を行う', () => {
    // UT-TM-051
    context('initialCreation=trueの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);

        // Act
        const actual = sut.requiresStoryIdAnnotation();

        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-TM-052
    context('initialCreation=falseの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(false);

        // Act
        const actual = sut.requiresStoryIdAnnotation();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('DesignDocumentFlags.allowsStoryIdOmission', () => {
  describe('story-id省略許可を判定する', () => {
    // UT-TM-053
    context('initialCreation=trueの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);

        // Act
        const actual = sut.allowsStoryIdOmission();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-054
    context('initialCreation=falseの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(false);

        // Act
        const actual = sut.allowsStoryIdOmission();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('DesignDocumentFlags.equals', () => {
  describe('2つのDesignDocumentFlagsの等価性を判定する', () => {
    // UT-TM-055
    context('同一フラグ値の場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);
        const other = createDesignDocumentFlags(true);

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-056
    context('異なるフラグ値の場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createDesignDocumentFlags(true);
        const other = createDesignDocumentFlags(false);

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
