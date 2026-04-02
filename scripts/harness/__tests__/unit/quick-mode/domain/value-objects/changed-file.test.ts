import { describe, expect, it } from 'vitest';
import { target, context, createChangedFile } from '../../../../helpers/test-helpers.js';
import { ChangedFile } from '../../../../../quick-mode/domain/value-objects/changed-file.js';

target('ChangedFile', () => {
  target('create', () => {
    describe('ChangedFileを生成する', () => {
      // UT-CF-001
      it('正常なfilePathとchangeKindが渡された場合にChangedFileが生成されること', () => {
        // Arrange
        const filePath = 'scripts/harness/quick-mode/services/quick-service.ts';
        const changeKind = 'MODIFY';
        // Act
        const actual = ChangedFile.create({ filePath, changeKind });
        // Assert
        expect(actual.filePath).toBe(filePath);
        expect(actual.changeKind).toBe(changeKind);
      });
    });

    context('filePathが空文字の場合', () => {
      // UT-CF-002
      it('エラーが発生すること', () => {
        // Arrange
        const input = { filePath: '', changeKind: 'MODIFY' as const };
        // Act
        const actual = () => ChangedFile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context('filePathが末尾スラッシュを含む場合', () => {
      // UT-CF-003
      it('エラーが発生すること', () => {
        // Arrange
        const input = { filePath: 'scripts/harness/quick-mode/', changeKind: 'MODIFY' as const };
        // Act
        const actual = () => ChangedFile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context("changeKindが'CREATE'/'MODIFY'/'DELETE'以外の場合", () => {
      // UT-CF-004
      it('エラーが発生すること', () => {
        // Arrange
        const input = {
          filePath: 'scripts/harness/quick-mode/services/quick-service.ts',
          changeKind: 'UPDATE' as unknown as 'MODIFY',
        };
        // Act
        const actual = () => ChangedFile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isUnder', () => {
    describe('filePathが指定ディレクトリ配下かを判定する', () => {
      // UT-CF-005
      it("'scripts/harness/quick-mode/domain/'で始まるfilePathの場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangedFile.create({
          filePath: 'scripts/harness/quick-mode/domain/value-objects/quick-mode-config.ts',
          changeKind: 'MODIFY',
        });
        // Act
        const actual = sut.isUnder('scripts/harness/quick-mode/domain/');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-006
      it('一致しないディレクトリプレフィックスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        // Act
        const actual = sut.isUnder('scripts/harness/quick-mode/domain/');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('hasExtension', () => {
    describe('指定拡張子との一致を判定する', () => {
      // UT-CF-007
      it("'.ts'拡張子を持つfilePathの場合にtrueが返ること", () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        // Act
        const actual = sut.hasExtension('.ts');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-008
      it("'.json'拡張子を持つfilePathの場合に'.ts'指定ではfalseが返ること", () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/phasegate.config.json');
        // Act
        const actual = sut.hasExtension('.ts');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('matchesPattern', () => {
    describe('glob/suffixパターンとの一致を判定する', () => {
      // UT-CF-009
      it("'*port.ts'パターンに一致するfilePathの場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangedFile.create({
          filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
          changeKind: 'MODIFY',
        });
        // Act
        const actual = sut.matchesPattern('*port.ts');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-010
      it("'*adapter.ts'パターンに一致しないfilePathの場合にfalseが返ること", () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        // Act
        const actual = sut.matchesPattern('*adapter.ts');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのChangedFileの値等価性を判定する', () => {
      // UT-CF-011
      it('同一filePath/changeKindを持つ2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createChangedFile();
        const other = createChangedFile();
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-012
      it('filePathが異なる2つのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        const other = createChangedFile('scripts/harness/quick-mode/domain/other.ts');
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
