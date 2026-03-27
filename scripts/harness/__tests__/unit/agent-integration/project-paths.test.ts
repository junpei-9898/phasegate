// @unit agent-integration
// @layer domain

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ProjectPaths } from '../../../agent-integration/domain/value-objects/project-paths.js';
import { ProjectPathsInvariantError } from '../../../agent-integration/domain/errors/project-paths-invariant-error.js';

const createProjectPaths = (
  overrides: Partial<{
    source: string[];
    docs: {
      construction: string;
      inception: string;
    };
  }> = {},
): ProjectPaths =>
  ProjectPaths.create(
    overrides.source ?? ['scripts/harness'],
    overrides.docs ?? {
      construction: 'docs/product/construction',
      inception: 'docs/inception',
    },
  );

target('ProjectPaths', () => {
  target('create()', () => {
    describe('正常な入力でProjectPathsを生成する', () => {
      context('sourceが1件でdocsが標準値の場合', () => {
        // UT-PP-001
        it('ProjectPathsが正常に生成されること', () => {
          // Arrange
          const source = ['scripts/harness'];
          const docs = {
            construction: 'docs/product/construction',
            inception: 'docs/inception',
          };

          // Act
          const actual = ProjectPaths.create(source, docs);

          // Assert
          expect(actual).toBeInstanceOf(ProjectPaths);
          expect(actual.getSource()).toEqual(['scripts/harness']);
          expect(actual.getDocsConstruction()).toBe('docs/product/construction');
          expect(actual.getDocsInception()).toBe('docs/inception');
        });
      });

      context('sourceが2件の場合', () => {
        // UT-PP-002
        it('複数のsourceで生成が成功すること', () => {
          // Arrange
          const source = ['scripts/harness', 'src'];
          const docs = {
            construction: 'build/construction',
            inception: 'build/inception',
          };

          // Act
          const actual = ProjectPaths.create(source, docs);

          // Assert
          expect(actual).toBeInstanceOf(ProjectPaths);
          expect(actual.getSource()).toEqual(['scripts/harness', 'src']);
        });
      });

      context('最小有効値が渡された場合', () => {
        // UT-PP-003
        it('最小有効値で生成が成功すること', () => {
          // Arrange
          const source = ['src'];
          const docs = {
            construction: 'a',
            inception: 'b',
          };

          // Act
          const actual = ProjectPaths.create(source, docs);

          // Assert
          expect(actual).toBeInstanceOf(ProjectPaths);
        });
      });
    });

    describe('不変条件を検証する', () => {
      context('sourceが空配列の場合', () => {
        // UT-PP-010
        it('ProjectPathsInvariantErrorがthrowされること', () => {
          // Arrange
          const source: string[] = [];
          const docs = {
            construction: 'docs/product/construction',
            inception: 'docs/inception',
          };

          // Act
          const actual = () => ProjectPaths.create(source, docs);

          // Assert
          expect(actual).toThrow(ProjectPathsInvariantError);
        });
      });

      context('docs.constructionが空文字の場合', () => {
        // UT-PP-011
        it('ProjectPathsInvariantErrorがthrowされること', () => {
          // Arrange
          const source = ['scripts/harness'];
          const docs = {
            construction: '',
            inception: 'docs/inception',
          };

          // Act
          const actual = () => ProjectPaths.create(source, docs);

          // Assert
          expect(actual).toThrow(ProjectPathsInvariantError);
        });
      });

      context('docs.inceptionが空文字の場合', () => {
        // UT-PP-012
        it('ProjectPathsInvariantErrorがthrowされること', () => {
          // Arrange
          const source = ['scripts/harness'];
          const docs = {
            construction: 'docs/product/construction',
            inception: '',
          };

          // Act
          const actual = () => ProjectPaths.create(source, docs);

          // Assert
          expect(actual).toThrow(ProjectPathsInvariantError);
        });
      });
    });
  });

  target('equals()', () => {
    describe('等値性を判定する', () => {
      context('同一フィールドを持つ2つのProjectPathsを比較する場合', () => {
        // UT-PP-020
        it('等値であること', () => {
          // Arrange
          const a = createProjectPaths();
          const b = createProjectPaths();

          // Act
          const actual = a.equals(b);

          // Assert
          expect(actual).toBe(true);
        });
      });

      context('sourceが異なる2つのProjectPathsを比較する場合', () => {
        // UT-PP-021
        it('非等値であること', () => {
          // Arrange
          const a = createProjectPaths({ source: ['scripts/harness'] });
          const b = createProjectPaths({ source: ['src'] });

          // Act
          const actual = a.equals(b);

          // Assert
          expect(actual).toBe(false);
        });
      });

      context('docs.constructionが異なる2つのProjectPathsを比較する場合', () => {
        // UT-PP-022
        it('非等値であること', () => {
          // Arrange
          const a = createProjectPaths({
            docs: {
              construction: 'docs/product/construction',
              inception: 'docs/inception',
            },
          });
          const b = createProjectPaths({
            docs: {
              construction: 'build/construction',
              inception: 'docs/inception',
            },
          });

          // Act
          const actual = a.equals(b);

          // Assert
          expect(actual).toBe(false);
        });
      });
    });
  });

  describe('境界値を検証する', () => {
    context('sourceが空配列の場合', () => {
      // UT-BV-019
      it('ProjectPathsInvariantErrorがthrowされること', () => {
        // Arrange
        const source: string[] = [];
        const docs = {
          construction: 'a',
          inception: 'b',
        };

        // Act
        const actual = () => ProjectPaths.create(source, docs);

        // Assert
        expect(actual).toThrow(ProjectPathsInvariantError);
      });
    });

    context('docs.constructionが空文字の場合', () => {
      // UT-BV-020
      it('ProjectPathsInvariantErrorがthrowされること', () => {
        // Arrange
        const source = ['src'];
        const docs = {
          construction: '',
          inception: 'b',
        };

        // Act
        const actual = () => ProjectPaths.create(source, docs);

        // Assert
        expect(actual).toThrow(ProjectPathsInvariantError);
      });
    });
  });
});
