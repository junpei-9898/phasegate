// @layer test
// @story H03-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { MetadataTag } from '../../../traceability-model/domain/value-objects/metadata-tag.js';

const createMetadataTag = (
  overrides: Partial<{
    type: '@unit' | '@layer' | '@story-id' | '@story';
    value: string;
    lineNumber: number;
  }> = {},
): MetadataTag =>
  MetadataTag.create({
    type: '@unit',
    value: 'traceability-model',
    lineNumber: 1,
    ...overrides,
  });

target('MetadataTag.create', () => {
  describe('メタデータタグを生成する', () => {
    // UT-TM-021
    context('typeが@unitの場合', () => {
      it('@unitタグが生成できること', () => {
        // Arrange
        const actual = MetadataTag.create({
          type: '@unit',
          value: 'traceability-model',
          lineNumber: 1,
        });

        // Act
        const type = actual.type;

        // Assert
        expect(type).toBe('@unit');
      });
    });

    // UT-TM-022
    context('typeが@layerの場合', () => {
      it('@layerタグが生成できること', () => {
        // Arrange
        const actual = MetadataTag.create({
          type: '@layer',
          value: 'domain',
          lineNumber: 2,
        });

        // Act
        const type = actual.type;

        // Assert
        expect(type).toBe('@layer');
      });
    });

    // UT-TM-023
    context('typeが@story-idの場合', () => {
      it('@story-idタグが生成できること', () => {
        // Arrange
        const actual = MetadataTag.create({
          type: '@story-id',
          value: 'H03-01',
          lineNumber: 3,
        });

        // Act
        const type = actual.type;

        // Assert
        expect(type).toBe('@story-id');
      });
    });

    // UT-TM-024
    context('typeが@storyの場合', () => {
      it('@storyタグが生成できること', () => {
        // Arrange
        const actual = MetadataTag.create({
          type: '@story',
          value: 'H03-01',
          lineNumber: 4,
        });

        // Act
        const type = actual.type;

        // Assert
        expect(type).toBe('@story');
      });
    });

    // UT-TM-025
    context('正規4種以外のtypeを渡す場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          MetadataTag.create({ type: '@owner', value: 'traceability-model', lineNumber: 1 });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });

    // UT-TM-026
    context('valueが空文字の場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () => MetadataTag.create({ type: '@unit', value: '', lineNumber: 1 });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });

    // UT-TM-027
    context('lineNumberが0の場合', () => {
      it('エラーが発生すること', () => {
        // Arrange
        const actual = () =>
          MetadataTag.create({ type: '@unit', value: 'traceability-model', lineNumber: 0 });

        // Act
        actual;

        // Assert
        expect(actual).toThrowError();
      });
    });
  });
});

target('MetadataTag.isUnitTag', () => {
  describe('タグ種別を判定する', () => {
    // UT-TM-028
    context('@unitタグとそれ以外を比較する場合', () => {
      it('@unitタグのみtrueを返すこと', () => {
        // Arrange
        const sut = createMetadataTag({ type: '@unit' });
        const other = createMetadataTag({ type: '@layer', value: 'domain' });

        // Act
        const actual = [sut.isUnitTag(), other.isUnitTag()];

        // Assert
        expect(actual).toEqual([true, false]);
      });
    });
  });
});

target('MetadataTag.isLayerTag', () => {
  describe('タグ種別を判定する', () => {
    // UT-TM-029
    context('@layerタグとそれ以外を比較する場合', () => {
      it('@layerタグのみtrueを返すこと', () => {
        // Arrange
        const sut = createMetadataTag({ type: '@layer', value: 'domain' });
        const other = createMetadataTag({ type: '@story', value: 'H03-01' });

        // Act
        const actual = [sut.isLayerTag(), other.isLayerTag()];

        // Assert
        expect(actual).toEqual([true, false]);
      });
    });
  });
});

target('MetadataTag.equals', () => {
  describe('2つのMetadataTagの等価性を判定する', () => {
    // UT-TM-030
    context('同一属性のインスタンス同士を比較する場合', () => {
      it('trueを返すこと', () => {
        // Arrange
        const sut = createMetadataTag({ type: '@story-id', value: 'H03-01', lineNumber: 9 });
        const other = createMetadataTag({ type: '@story-id', value: 'H03-01', lineNumber: 9 });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
