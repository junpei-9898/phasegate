import { describe, expect, it } from 'vitest';
import { target, context, createAcMapping, createTestReference, createStoryMapping } from '../../helpers/test-helpers.js';
import { StoryMapping } from '../../../nyquist-validation/domain/entities/story-mapping.js';
import { InvalidAcIdFormatError } from '../../../nyquist-validation/domain/errors/invalid-ac-id-format-error.js';
import { InvalidTestTypeError } from '../../../nyquist-validation/domain/errors/invalid-test-type-error.js';
import { EmptyFilePathError } from '../../../nyquist-validation/domain/errors/empty-file-path-error.js';

target('StoryMapping', () => {

  describe('生成テスト', () => {
    // UT-SM-001
    it('有効なstoryId と AcMapping 1件でインスタンスが生成されること', () => {
      // Arrange
      const acMapping = createAcMapping('AC-1');
      // Act
      const actual = StoryMapping.create({ storyId: 'H07-01', acMappings: [acMapping] });
      // Assert
      expect(actual.storyId).toBe('H07-01');
      expect(actual.acMappings).toHaveLength(1);
    });

    // UT-SM-002
    it('acMappingsが空配列のときインスタンスが生成されAC数が 0 であること', () => {
      // Arrange
      // Act
      const actual = StoryMapping.create({ storyId: 'H07-01', acMappings: [] });
      // Assert
      expect(actual.acMappings).toHaveLength(0);
    });

    // UT-SM-003
    it('acMappingsに不正なacId（AC-0）が含まれる場合 InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const badAcMapping = () => StoryMapping.create({ storyId: 'H07-01', acMappings: [createAcMapping('AC-0')] });
      // Act / Assert
      expect(badAcMapping).toThrowError(InvalidAcIdFormatError);
    });

    // UT-SM-004
    it('TestReferenceに不正なtestTypeが含まれる場合 InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const badRef = () => createTestReference({ testType: 'e2e' });
      // Act / Assert
      expect(badRef).toThrowError(InvalidTestTypeError);
    });

    // UT-SM-005
    it('TestReferenceに空のfilePathが含まれる場合 EmptyFilePathError がthrowされること', () => {
      // Arrange
      const badRef = () => createTestReference({ filePath: '' });
      // Act / Assert
      expect(badRef).toThrowError(EmptyFilePathError);
    });
  });

  describe('ビジネスルールテスト（equals）', () => {
    // UT-SM-006
    it('同一storyIdのStoryMapping同士で equals が true を返すこと', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01');
      const sm2 = createStoryMapping('H07-01');
      // Act
      const actual = sm1.equals(sm2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-SM-007
    it('異なるstoryIdのStoryMapping同士で equals が false を返すこと', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01');
      const sm2 = createStoryMapping('H07-02');
      // Act
      const actual = sm1.equals(sm2);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('振る舞いテスト', () => {
    // UT-SM-008
    it('findAcMapping で存在するacId（AC-1）を指定すると対応するAcMappingが返されること', () => {
      // Arrange
      const acMapping = createAcMapping('AC-1');
      const sut = createStoryMapping('H07-01', [acMapping]);
      // Act
      const actual = sut.findAcMapping('AC-1');
      // Assert
      expect(actual).not.toBeNull();
      expect(actual?.acId).toBe('AC-1');
    });

    // UT-SM-009
    it('findAcMapping で存在しないacId（AC-99）を指定すると null が返されること', () => {
      // Arrange
      const sut = createStoryMapping('H07-01', [createAcMapping('AC-1')]);
      // Act
      const actual = sut.findAcMapping('AC-99');
      // Assert
      expect(actual).toBeNull();
    });

    // UT-SM-010
    it('uncoveredAcIds でテスト参照なしAcMapping 2件・あり 1件のとき未カバーの2件のacIdが返されること', () => {
      // Arrange
      const covered = createAcMapping('AC-1', [createTestReference()]);
      const uncovered1 = createAcMapping('AC-2', []);
      const uncovered2 = createAcMapping('AC-3', []);
      const sut = createStoryMapping('H07-01', [covered, uncovered1, uncovered2]);
      // Act
      const actual = sut.uncoveredAcIds();
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual).toContain('AC-2');
      expect(actual).toContain('AC-3');
    });

    // UT-SM-011
    it('uncoveredAcIds で全AcMappingにテスト参照がある場合に空配列が返されること', () => {
      // Arrange
      const covered1 = createAcMapping('AC-1', [createTestReference()]);
      const covered2 = createAcMapping('AC-2', [createTestReference()]);
      const sut = createStoryMapping('H07-01', [covered1, covered2]);
      // Act
      const actual = sut.uncoveredAcIds();
      // Assert
      expect(actual).toHaveLength(0);
    });

    // UT-SM-012
    it('uncoveredAcIds で acMappingsが空配列のとき空配列が返されること', () => {
      // Arrange
      const sut = createStoryMapping('H07-01', []);
      // Act
      const actual = sut.uncoveredAcIds();
      // Assert
      expect(actual).toHaveLength(0);
    });
  });
});
