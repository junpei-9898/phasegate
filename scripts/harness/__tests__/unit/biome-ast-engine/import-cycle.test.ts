import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import {
  ImportCycle,
  InvalidImportCycleError,
} from '../../../biome-ast-engine/domain/value-objects/import-cycle.js';

const createFilePath = (value: string): FilePath => FilePath.fromWorkspaceRelative(value);

const createImportCycle = (
  paths: readonly FilePath[] = [createFilePath('a.ts'), createFilePath('b.ts')]
): ImportCycle => ImportCycle.create(paths);

target('ImportCycle.create', () => {
  describe('循環経路を生成する', () => {
    context('2ノード以上のパスの場合', () => {
      it('ImportCycleが生成される', () => {
        // Arrange
        const paths = [createFilePath('a.ts'), createFilePath('b.ts')];

        // Act
        const actual = ImportCycle.create(paths);

        // Assert
        expect(actual.includes(createFilePath('a.ts'))).toBe(true);
      });
    });

    context('1ノードのパスの場合', () => {
      it('InvalidImportCycleErrorがスローされる', () => {
        // Arrange
        const paths = [createFilePath('a.ts')];

        // Act
        const actual = () => ImportCycle.create(paths);

        // Assert
        expect(actual).toThrow(InvalidImportCycleError);
      });
    });

    context('空のパスの場合', () => {
      it('InvalidImportCycleErrorがスローされる', () => {
        // Arrange
        const paths: FilePath[] = [];

        // Act
        const actual = () => ImportCycle.create(paths);

        // Assert
        expect(actual).toThrow(InvalidImportCycleError);
      });
    });
  });
});

target('ImportCycle.includes', () => {
  describe('指定ファイルが循環経路に含まれるかを判定する', () => {
    context('経路に含まれるファイルの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createImportCycle([createFilePath('a.ts'), createFilePath('b.ts')]);
        const targetPath = createFilePath('b.ts');

        // Act
        const actual = sut.includes(targetPath);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('経路に含まれないファイルの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createImportCycle([createFilePath('a.ts'), createFilePath('b.ts')]);
        const targetPath = createFilePath('c.ts');

        // Act
        const actual = sut.includes(targetPath);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

