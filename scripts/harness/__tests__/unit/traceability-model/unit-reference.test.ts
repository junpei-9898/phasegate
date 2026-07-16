// @layer test
// @story H03-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ProjectRelativePath } from '../../../traceability-model/domain/value-objects/project-relative-path.js';
import { UnitReference } from '../../../traceability-model/domain/value-objects/unit-reference.js';

const createProjectRelativePath = (
  value = 'docs/product/construction/traceability-model',
): ProjectRelativePath => ProjectRelativePath.create(value);

const createUnitReferenceResolved = (): UnitReference =>
  UnitReference.resolved({
    unitName: 'traceability-model',
    constructionRoot: createProjectRelativePath(),
  });

const createUnitReferenceUnresolved = (): UnitReference =>
  UnitReference.unresolved({
    unitName: 'unknown-unit',
  });

target('UnitReference.resolved', () => {
  describe('Unit定義と照合済みの参照を生成する', () => {
    // UT-TM-031
    context('存在するUnit名とconstructionRootを指定する場合', () => {
      it('resolved=trueかつconstructionRootが設定されたインスタンスを返すこと', () => {
        // Arrange
        const input = Object.freeze({
          unitName: 'traceability-model',
          constructionRoot: createProjectRelativePath(),
        });

        // Act
        const actual = UnitReference.resolved(input);

        // Assert
        expect(actual.unitName).toBe('traceability-model');
        expect(actual.resolved).toBe(true);
        expect(actual.constructionRoot?.value).toBe('docs/product/construction/traceability-model');
      });
    });
  });
});

target('UnitReference.unresolved', () => {
  describe('未照合のUnit参照を生成する', () => {
    // UT-TM-032
    context('未知のUnit名を指定する場合', () => {
      it('resolved=falseかつconstructionRoot=nullのインスタンスを返すこと', () => {
        // Arrange
        const input = Object.freeze({ unitName: 'unknown-unit' });

        // Act
        const actual = UnitReference.unresolved(input);

        // Assert
        expect(actual.unitName).toBe('unknown-unit');
        expect(actual.resolved).toBe(false);
        expect(actual.constructionRoot).toBeNull();
      });
    });
  });
});

target('UnitReference.isResolved', () => {
  describe('照合状態を判定する', () => {
    // UT-TM-033
    context('resolved=trueの場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createUnitReferenceResolved();

        // Act
        const actual = sut.isResolved();

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TM-034
    context('resolved=falseの場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createUnitReferenceUnresolved();

        // Act
        const actual = sut.isResolved();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('UnitReference.equals', () => {
  describe('2つのUnitReferenceの等価性を判定する', () => {
    // UT-TM-035
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createUnitReferenceResolved();
        const other = createUnitReferenceResolved();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
