// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  ProjectRelativePath,
} from '../../../traceability-model/domain/value-objects/project-relative-path.js';

const createProjectRelativePath = (
  value = 'docs/product/construction/traceability-model/domain_model.md',
): ProjectRelativePath => ProjectRelativePath.create(value);

target('ProjectRelativePath.basename', () => {
  describe('ファイル名を取得する', () => {
    context('ファイルパスを保持している場合', () => {
      it('正しいファイル名を返すこと', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.basename();

        // Assert
        expect(actual).toBe('domain_model.md');
      });
    });
  });
});

target('ProjectRelativePath.extname', () => {
  describe('拡張子を取得する', () => {
    context('拡張子を持つパスの場合', () => {
      it('正しい拡張子を返すこと', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.extname();

        // Assert
        expect(actual).toBe('.md');
      });
    });
  });
});

target('ProjectRelativePath.startsWith', () => {
  describe('パスの前方一致を判定する', () => {
    context('指定プレフィックスと比較する場合', () => {
      it('前方一致を正しく判定すること', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.startsWith('docs/product');

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
