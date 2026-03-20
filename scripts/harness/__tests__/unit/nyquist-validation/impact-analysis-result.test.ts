import { describe, expect, it } from 'vitest';
import { target, context, createTestReference } from '../../helpers/test-helpers.js';
import { ImpactAnalysisResult } from '../../../nyquist-validation/domain/value-objects/impact-analysis-result.js';

target('ImpactAnalysisResult', () => {

  describe('生成テスト', () => {
    // UT-IAR-001
    it('有効なstoryId と directTests 2件でインスタンスが生成され directMappingOnly=true が設定されること', () => {
      // Arrange
      const refs = [
        createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts' }),
        createTestReference({ filePath: 'scripts/__tests__/unit/b.test.ts' }),
      ];
      // Act
      const actual = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: refs });
      // Assert
      expect(actual.storyId).toBe('H07-01');
      expect(actual.directTests).toHaveLength(2);
      expect(actual.directMappingOnly).toBe(true);
    });

    // UT-IAR-002
    it('directTestsが空配列のとき isEmpty=true のインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [] });
      // Assert
      expect(actual.directTests).toHaveLength(0);
      expect(actual.isEmpty()).toBe(true);
    });

    // UT-IAR-003
    it('directTestsに重複filePathの TestReference が含まれる場合に重複が除去されたdirectTestsで生成されること', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'unit' });
      // Act
      const actual = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [ref1, ref2] });
      // Assert
      expect(actual.directTests).toHaveLength(1);
    });
  });

  describe('等値性テスト', () => {
    // UT-IAR-004
    it('同一storyId・同一directTestsのとき equals が true を返すこと', () => {
      // Arrange
      const ref = createTestReference();
      const iar1 = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [ref] });
      const iar2 = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [ref] });
      // Act
      const actual = iar1.equals(iar2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-IAR-005
    it('異なるstoryId・同一directTestsのとき equals が false を返すこと', () => {
      // Arrange
      const ref = createTestReference();
      const iar1 = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [ref] });
      const iar2 = ImpactAnalysisResult.create({ storyId: 'H07-02', directTests: [ref] });
      // Act
      const actual = iar1.equals(iar2);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-IAR-006
    it('同一storyId・異なるdirectTestsのとき equals が false を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts' });
      const ref2 = createTestReference({ filePath: 'scripts/__tests__/unit/b.test.ts' });
      const iar1 = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [ref1] });
      const iar2 = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [ref2] });
      // Act
      const actual = iar1.equals(iar2);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('振る舞いテスト', () => {
    // UT-IAR-007
    it('directTestsが空配列のとき isEmpty が true を返すこと', () => {
      // Arrange
      const sut = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [] });
      // Act
      const actual = sut.isEmpty();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-IAR-008
    it('directTestsが1件のとき isEmpty が false を返すこと', () => {
      // Arrange
      const sut = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [createTestReference()] });
      // Act
      const actual = sut.isEmpty();
      // Assert
      expect(actual).toBe(false);
    });

    // UT-IAR-009
    it('任意の有効な入力で生成したとき directMappingOnly が常に true であること', () => {
      // Arrange
      const sut = ImpactAnalysisResult.create({ storyId: 'H07-01', directTests: [createTestReference()] });
      // Act
      const actual = sut.directMappingOnly;
      // Assert
      expect(actual).toBe(true);
    });
  });
});
