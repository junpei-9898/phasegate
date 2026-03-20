import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { ImportEdge } from '../../../biome-ast-engine/domain/value-objects/import-edge.js';

const createFilePath = (value: string): FilePath => FilePath.fromWorkspaceRelative(value);

const createImportEdge = ({
  from = createFilePath('a.ts'),
  to = createFilePath('b.ts'),
  importKind = 'value',
}: {
  from?: FilePath;
  to?: FilePath;
  importKind?: 'value' | 'type' | 'dynamic';
} = {}): ImportEdge => ImportEdge.create({ from, to, importKind });

target('ImportEdge.create', () => {
  describe('import辺を生成する', () => {
    context('正常なfrom/toとimportKind"value"の場合', () => {
      it('value型のImportEdgeが生成される', () => {
        // Arrange
        const from = createFilePath('a.ts');
        const to = createFilePath('b.ts');
        const importKind = 'value';

        // Act
        const actual = ImportEdge.create({ from, to, importKind });

        // Assert
        expect(actual.isTypeOnly()).toBe(false);
        expect(actual.from).toBe(from);
        expect(actual.to).toBe(to);
      });
    });

    context('importKindが"type"の場合', () => {
      it('type型のImportEdgeが生成される', () => {
        // Arrange
        const from = createFilePath('a.ts');
        const to = createFilePath('b.ts');
        const importKind = 'type';

        // Act
        const actual = ImportEdge.create({ from, to, importKind });

        // Assert
        expect(actual.isTypeOnly()).toBe(true);
      });
    });

    context('importKindが"dynamic"の場合', () => {
      it('dynamic型のImportEdgeが生成される', () => {
        // Arrange
        const from = createFilePath('a.ts');
        const to = createFilePath('b.ts');
        const importKind = 'dynamic';

        // Act
        const actual = ImportEdge.create({ from, to, importKind });

        // Assert
        expect(actual.importKind).toBe('dynamic');
      });
    });
  });
});

target('ImportEdge.equals', () => {
  describe('等価性を判定する', () => {
    context('同一属性のImportEdgeの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createImportEdge();
        const right = createImportEdge();

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('異なる属性のImportEdgeの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const left = createImportEdge();
        const right = createImportEdge({ importKind: 'type' });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('ImportEdge.isTypeOnly', () => {
  describe('type-only importを判別する', () => {
    context('importKindが"type"の場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createImportEdge({ importKind: 'type' });

        // Act
        const actual = sut.isTypeOnly();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('importKindが"value"の場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createImportEdge({ importKind: 'value' });

        // Act
        const actual = sut.isTypeOnly();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('ImportEdge.touches', () => {
  describe('指定ファイルがエッジに含まれるかを判定する', () => {
    context('fromが一致する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createImportEdge({
          from: createFilePath('a.ts'),
          to: createFilePath('b.ts'),
        });
        const targetPath = createFilePath('a.ts');

        // Act
        const actual = sut.touches(targetPath);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
