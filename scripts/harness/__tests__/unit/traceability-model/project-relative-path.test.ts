// @layer test
// @story H03-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  ProjectRelativePath,
  ProjectRelativePathError,
} from '../../../traceability-model/domain/value-objects/project-relative-path.js';

const createProjectRelativePath = (
  value = 'docs/product/construction/traceability-model/domain_model.md',
): ProjectRelativePath => ProjectRelativePath.create(value);

target('ProjectRelativePath.create', () => {
  describe('プロジェクト相対パスを生成する', () => {
    // UT-TM-009
    context('docs/配下の正規パスの場合', () => {
      it('docs/配下の正規パスが生成できること', () => {
        // Arrange
        const input = 'docs/product/user_stories.md';

        // Act
        const actual = ProjectRelativePath.create(input);

        // Assert
        expect(actual.value).toBe('docs/product/user_stories.md');
      });
    });

    // UT-TM-010
    context('scripts/配下のパスの場合', () => {
      it('scripts/配下の正規パスが生成できること', () => {
        // Arrange
        const input = 'scripts/harness/main.ts';

        // Act
        const actual = ProjectRelativePath.create(input);

        // Assert
        expect(actual.value).toBe('scripts/harness/main.ts');
      });
    });

    // UT-TM-011
    context('空文字の場合', () => {
      it('ProjectRelativePathErrorが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });

    // UT-TM-012
    context('絶対パスの場合', () => {
      it('ProjectRelativePathErrorが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('/etc/passwd');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });

    // UT-TM-013
    context('..によるルート脱出パスの場合', () => {
      it('ProjectRelativePathErrorが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('docs/../../etc/passwd');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });

    // UT-TM-014
    context('バックスラッシュを含むパスの場合', () => {
      it('ProjectRelativePathErrorが発生すること', () => {
        // Arrange
        const actual = () => ProjectRelativePath.create('docs\\product\\a.md');

        // Act
        actual;

        // Assert
        expect(actual).toThrowError(ProjectRelativePathError);
      });
    });
  });
});

target('ProjectRelativePath.join', () => {
  describe('パスセグメントを結合する', () => {
    // UT-TM-016
    context('複数セグメントを結合する場合', () => {
      it('結合後のProjectRelativePathが返されること', () => {
        // Arrange
        const sut = ProjectRelativePath.create('docs/product');

        // Act
        const actual = sut.join('construction', 'traceability-model');

        // Assert
        expect(actual.value).toBe('docs/product/construction/traceability-model');
      });
    });
  });
});

target('ProjectRelativePath.dirname', () => {
  describe('親ディレクトリパスを取得する', () => {
    // UT-TM-017
    context('複数セグメントのパスの場合', () => {
      it('正しい親ディレクトリのProjectRelativePathが返されること', () => {
        // Arrange
        const sut = createProjectRelativePath();

        // Act
        const actual = sut.dirname();

        // Assert
        expect(actual.value).toBe('docs/product/construction/traceability-model');
      });
    });
  });
});

target('ProjectRelativePath.basename', () => {
  describe('ファイル名を取得する', () => {
    // UT-TM-018
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
    // UT-TM-019
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
    // UT-TM-020
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
