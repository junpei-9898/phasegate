import { describe, expect, it } from 'vitest';
import { target, context, createStoryMapping, createAcMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers.js';
import { RequirementTestMatrix } from '../../../nyquist-validation/domain/aggregates/requirement-test-matrix.js';
import { DuplicateStoryMappingError } from '../../../nyquist-validation/domain/errors/duplicate-story-mapping-error.js';
import { InvalidAcIdFormatError } from '../../../nyquist-validation/domain/errors/invalid-ac-id-format-error.js';
import { InvalidTestTypeError } from '../../../nyquist-validation/domain/errors/invalid-test-type-error.js';
import { EmptyFilePathError } from '../../../nyquist-validation/domain/errors/empty-file-path-error.js';

target('RequirementTestMatrix', () => {

  describe('生成テスト', () => {
    // UT-RTM-001
    it('有効なStoryMapping 1件でインスタンスが生成されること', () => {
      // Arrange
      const storyMapping = createStoryMapping('H07-01');
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [storyMapping] });
      // Assert
      expect(actual.storyMappings).toHaveLength(1);
    });

    // UT-RTM-002
    it('storyMappingsが空配列でインスタンスが生成され totalAcCount が 0 であること', () => {
      // Arrange
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [] });
      // Assert
      expect(actual.storyMappings).toHaveLength(0);
      expect(actual.totalAcCount()).toBe(0);
    });

    // UT-RTM-003
    it('storyMappingsが複数件（異なるstoryId）のとき全StoryMappingを内包したインスタンスが生成されること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01');
      const sm2 = createStoryMapping('H07-02');
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm1, sm2] });
      // Assert
      expect(actual.storyMappings).toHaveLength(2);
    });

    // UT-RTM-004
    it('acMappingsが空配列のStoryMappingを含む場合にインスタンスが生成されること', () => {
      // Arrange
      const sm = createStoryMapping('H07-01', []);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings[0].acMappings).toHaveLength(0);
    });

    // UT-RTM-005
    it('testReferencesが空配列のAcMappingを含む場合にインスタンスが生成され未カバーACとして保持されること', () => {
      // Arrange
      const acMapping = createAcMapping('AC-1', []);
      const sm = createStoryMapping('H07-01', [acMapping]);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings[0].acMappings[0].isCovered()).toBe(false);
    });
  });

  describe('不変条件テスト（INV-1: storyId重複禁止）', () => {
    // UT-RTM-006
    it('同一storyIdのStoryMappingが2件ある場合 DuplicateStoryMappingError がthrowされること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01');
      const sm2 = createStoryMapping('H07-01');
      // Act
      const actual = () => RequirementTestMatrix.create({ storyMappings: [sm1, sm2] });
      // Assert
      expect(actual).toThrowError(DuplicateStoryMappingError);
    });

    // UT-RTM-007
    it('異なるstoryIdのStoryMappingが各1件の場合に正常にインスタンスが生成されること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01');
      const sm2 = createStoryMapping('H07-02');
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm1, sm2] });
      // Assert
      expect(actual.storyMappings).toHaveLength(2);
    });
  });

  describe('不変条件テスト（INV-2: acId形式）', () => {
    // UT-RTM-008
    it('acIdが AC-0 のAcMappingを含む場合 InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const badAcMapping = () => createAcMapping('AC-0');
      // Act / Assert
      expect(badAcMapping).toThrowError(InvalidAcIdFormatError);
    });

    // UT-RTM-009
    it('acIdが AC-01（ゼロパディング）のAcMappingを含む場合 InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const badAcMapping = () => createAcMapping('AC-01');
      // Act / Assert
      expect(badAcMapping).toThrowError(InvalidAcIdFormatError);
    });

    // UT-RTM-010
    it('acIdが AC-1（最小正整数）のAcMappingを含む場合に正常にインスタンスが生成されること', () => {
      // Arrange
      const acMapping = createAcMapping('AC-1');
      const sm = createStoryMapping('H07-01', [acMapping]);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings[0].acMappings[0].acId).toBe('AC-1');
    });

    // UT-RTM-011
    it('acIdが AC-10（複数桁正整数）のAcMappingを含む場合に正常にインスタンスが生成されること', () => {
      // Arrange
      const acMapping = createAcMapping('AC-10');
      const sm = createStoryMapping('H07-01', [acMapping]);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings[0].acMappings[0].acId).toBe('AC-10');
    });

    // UT-RTM-012
    it('acIdが AC-（数字なし）のAcMappingを含む場合 InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const badAcMapping = () => createAcMapping('AC-');
      // Act / Assert
      expect(badAcMapping).toThrowError(InvalidAcIdFormatError);
    });
  });

  describe('不変条件テスト（INV-3: testType列挙）', () => {
    // UT-RTM-013
    it('testTypeが unit の場合に正常にインスタンスが生成されること', () => {
      // Arrange
      const ref = createTestReference({ testType: 'unit' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref])]);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings).toHaveLength(1);
    });

    // UT-RTM-014
    it('testTypeが it の場合に正常にインスタンスが生成されること', () => {
      // Arrange
      const ref = createTestReference({ testType: 'it' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref])]);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings).toHaveLength(1);
    });

    // UT-RTM-015
    it('testTypeが scenario の場合に正常にインスタンスが生成されること', () => {
      // Arrange
      const ref = createTestReference({ testType: 'scenario' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref])]);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings).toHaveLength(1);
    });

    // UT-RTM-016
    it('testTypeが e2e の場合 InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const badRef = () => createTestReference({ testType: 'e2e' });
      // Act / Assert
      expect(badRef).toThrowError(InvalidTestTypeError);
    });

    // UT-RTM-017
    it('testTypeが空文字の場合 InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const badRef = () => createTestReference({ testType: '' });
      // Act / Assert
      expect(badRef).toThrowError(InvalidTestTypeError);
    });
  });

  describe('不変条件テスト（INV-4: filePath非空）', () => {
    // UT-RTM-018
    it('filePathが空文字の場合 EmptyFilePathError がthrowされること', () => {
      // Arrange
      const badRef = () => createTestReference({ filePath: '' });
      // Act / Assert
      expect(badRef).toThrowError(EmptyFilePathError);
    });

    // UT-RTM-019
    it('filePathがスペースのみの場合 EmptyFilePathError がthrowされること', () => {
      // Arrange
      const badRef = () => createTestReference({ filePath: '   ' });
      // Act / Assert
      expect(badRef).toThrowError(EmptyFilePathError);
    });

    // UT-RTM-020
    it('filePathが有効なパスの場合に正常にインスタンスが生成されること', () => {
      // Arrange
      const ref = createTestReference({ filePath: 'scripts/harness/__tests__/unit/foo.test.ts' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref])]);
      // Act
      const actual = RequirementTestMatrix.create({ storyMappings: [sm] });
      // Assert
      expect(actual.storyMappings).toHaveLength(1);
    });
  });

  describe('状態遷移テスト', () => {
    // UT-RTM-021
    it('findStoryMapping で存在するstoryIdを指定するとそのStoryMappingが返されること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01');
      const sm2 = createStoryMapping('H07-02');
      const sut = RequirementTestMatrix.create({ storyMappings: [sm1, sm2] });
      // Act
      const actual = sut.findStoryMapping('H07-01');
      // Assert
      expect(actual).not.toBeNull();
      expect(actual?.storyId).toBe('H07-01');
    });

    // UT-RTM-022
    it('findStoryMapping で存在しないstoryIdを指定すると null が返されること', () => {
      // Arrange
      const sut = createRequirementTestMatrix([createStoryMapping('H07-01')]);
      // Act
      const actual = sut.findStoryMapping('H07-99');
      // Assert
      expect(actual).toBeNull();
    });

    // UT-RTM-023
    it('totalAcCount で各StoryMappingのAC数の合計が返されること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1'), createAcMapping('AC-2')]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1'), createAcMapping('AC-2')]);
      const sut = RequirementTestMatrix.create({ storyMappings: [sm1, sm2] });
      // Act
      const actual = sut.totalAcCount();
      // Assert
      expect(actual).toBe(4);
    });

    // UT-RTM-024
    it('coveredAcCount でカバー済みACのみ数えた値が返されること', () => {
      // Arrange
      const covered1 = createAcMapping('AC-1', [createTestReference()]);
      const covered2 = createAcMapping('AC-2', [createTestReference()]);
      const uncovered = createAcMapping('AC-3', []);
      const sm1 = createStoryMapping('H07-01', [covered1]);
      const sm2 = createStoryMapping('H07-02', [covered2, uncovered]);
      const sut = RequirementTestMatrix.create({ storyMappings: [sm1, sm2] });
      // Act
      const actual = sut.coveredAcCount();
      // Assert
      expect(actual).toBe(2);
    });

    // UT-RTM-025
    it('storyMappingsが空配列のとき totalAcCount が 0 を返すこと', () => {
      // Arrange
      const sut = RequirementTestMatrix.create({ storyMappings: [] });
      // Act
      const actual = sut.totalAcCount();
      // Assert
      expect(actual).toBe(0);
    });

    // UT-RTM-026
    it('storyMappingsが空配列のとき coveredAcCount が 0 を返すこと', () => {
      // Arrange
      const sut = RequirementTestMatrix.create({ storyMappings: [] });
      // Act
      const actual = sut.coveredAcCount();
      // Assert
      expect(actual).toBe(0);
    });

    // UT-RTM-027
    it('getAllStoryMappings でstoryId昇順のreadonly配列が返されること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-02');
      const sm2 = createStoryMapping('H07-01');
      const sut = RequirementTestMatrix.create({ storyMappings: [sm1, sm2] });
      // Act
      const actual = sut.getAllStoryMappings();
      // Assert
      expect(actual[0].storyId).toBe('H07-01');
      expect(actual[1].storyId).toBe('H07-02');
    });
  });
});
