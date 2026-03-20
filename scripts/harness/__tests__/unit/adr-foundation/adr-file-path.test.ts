import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AdrId } from '../../../adr-foundation/domain/value-objects/adr-id.js';
import {
  AdrFilePath,
  InvalidAdrFilePathError,
} from '../../../adr-foundation/domain/value-objects/adr-file-path.js';

const createAdrId = (value = '001'): AdrId => AdrId.create(value);
const createAdrFilePath = (value = 'docs/ADR/001-some-title.md'): AdrFilePath =>
  AdrFilePath.create(value);

target('AdrFilePath', () => {
  target('create', () => {
    // UT-AF-118, UT-AF-119, UT-AF-120, UT-AF-121
    context('不正なADRファイルパスを渡す場合', () => {
      it('生成に失敗すること', () => {
        // Arrange
        const inputs = [
          'docs/ADR/template.md',
          'invalid/path.md',
          'docs/ADR/001-some-title.txt',
          'docs/ADR/title-only.md',
        ];

        // Act
        const actual = () => {
          for (const input of inputs) {
            AdrFilePath.create(input);
          }
        };

        // Assert
        expect(actual).toThrowError(InvalidAdrFilePathError);
      });
    });
  });

  target('fromAdr', () => {
    // UT-AF-122
    context('AdrIdとタイトルから生成する場合', () => {
      it('スラッグ付きのADRファイルパスを返すこと', () => {
        // Arrange
        const adrId = createAdrId('001');

        // Act
        const actual = AdrFilePath.fromAdr(adrId, 'Package Separation');

        // Assert
        expect(actual.toString()).toMatch(/^docs\/ADR\/001-[a-z0-9-]+\.md$/);
      });
    });
  });

  target('getAdrId', () => {
    // UT-AF-123
    context('ADRファイルパスから識別子を取得する場合', () => {
      it('ADR識別子が返ること', () => {
        // Arrange
        const sut = createAdrFilePath('docs/ADR/001-some-title.md');

        // Act
        const actual = sut.getAdrId();

        // Assert
        expect(actual.equals(createAdrId('001'))).toBe(true);
      });
    });
  });

  target('toString', () => {
    // UT-AF-124
    context('保持しているパスを文字列化する場合', () => {
      it('元のパス文字列を返すこと', () => {
        // Arrange
        const sut = createAdrFilePath('docs/ADR/001-some-title.md');

        // Act
        const actual = sut.toString();

        // Assert
        expect(actual).toBe('docs/ADR/001-some-title.md');
      });
    });
  });

  target('equals', () => {
    // UT-AF-125
    context('同じパスを比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrFilePath('docs/ADR/001-some-title.md');
        const other = createAdrFilePath('docs/ADR/001-some-title.md');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-AF-126
    context('異なるパスを比較する場合', () => {
      it('falseを返すこと', () => {
        // Arrange
        const sut = createAdrFilePath('docs/ADR/001-some-title.md');
        const other = createAdrFilePath('docs/ADR/002-other-title.md');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
