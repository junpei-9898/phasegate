# ユニットテストロジック設計: nyquist-validation

@story-id H07-01
@story-id H07-02
@story-id H07-03
@story-id H07-04
> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **インプット**: `unit_test_design.md`, `unit_test_logic_plan.md`, `docs/principles/testing-rules.md`

---

## 1. テストファイル構成

| テストファイル | 対象クラス | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/nyquist-validation/requirement-test-matrix.test.ts` | RequirementTestMatrix（集約） | 27 |
| `scripts/harness/__tests__/unit/nyquist-validation/story-mapping.test.ts` | StoryMapping（エンティティ） | 12 |
| `scripts/harness/__tests__/unit/nyquist-validation/ac-mapping.test.ts` | AcMapping（VO） | 14 |
| `scripts/harness/__tests__/unit/nyquist-validation/test-reference.test.ts` | TestReference（VO） | 12 |
| `scripts/harness/__tests__/unit/nyquist-validation/coverage-result.test.ts` | CoverageResult（VO） | 14 |
| `scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-result.test.ts` | ImpactAnalysisResult（VO） | 9 |
| `scripts/harness/__tests__/unit/nyquist-validation/ac-coverage-gate-policy.test.ts` | AcCoverageGatePolicy（DS） | 14 |
| `scripts/harness/__tests__/unit/nyquist-validation/coverage-calculation-service.test.ts` | CoverageCalculationService（DS） | 9 |
| `scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-service.test.ts` | ImpactAnalysisService（DS） | 7 |
| `scripts/harness/__tests__/unit/nyquist-validation/matrix-validation-service.test.ts` | MatrixValidationService（DS） | 12 |

※横断境界値（UT-BND-*）は各ファイルに分散して記載（15件）

---

## 2. 共通ヘルパー・ファクトリ

`scripts/harness/__tests__/helpers/test-helpers.ts` に追加する関数：

```typescript
import { describe } from 'vitest';

/**
 * テスト対象のメソッド/クラスを示すdescribeエイリアス（既存）
 */
export const target = describe;

/**
 * テストの前提条件を示すdescribeエイリアス（既存）
 */
export const context = describe;

// --- nyquist-validation ファクトリ関数 ---

/**
 * TestReference を生成する。
 * デフォルト: filePath="scripts/harness/__tests__/unit/foo.test.ts", testType="unit"
 */
export const createTestReference = (overrides: Partial<{ filePath: string; testType: string }> = {}) =>
  TestReference.create({
    filePath: 'scripts/harness/__tests__/unit/foo.test.ts',
    testType: 'unit',
    ...overrides,
  });

/**
 * AcMapping を生成する。
 * デフォルト: acId="AC-1", testReferences=[createTestReference()]
 */
export const createAcMapping = (
  acId = 'AC-1',
  refs: TestReference[] = [createTestReference()]
) => AcMapping.create({ acId, testReferences: refs });

/**
 * StoryMapping を生成する。
 * デフォルト: storyId="H07-01", acMappings=[createAcMapping()]
 */
export const createStoryMapping = (
  storyId = 'H07-01',
  acMappings: AcMapping[] = [createAcMapping()]
) => StoryMapping.create({ storyId, acMappings });

/**
 * RequirementTestMatrix を生成する。
 * デフォルト: storyMappings=[createStoryMapping()]
 */
export const createRequirementTestMatrix = (
  storyMappings: StoryMapping[] = [createStoryMapping()]
) => RequirementTestMatrix.create({ storyMappings });

/**
 * CoverageResult を生成する。
 * デフォルト: rate=1.0, coveredAcCount=1, totalAcCount=1, uncoveredAcIds=[]
 */
export const createCoverageResult = (
  overrides: Partial<{ rate: number; coveredAcCount: number; totalAcCount: number; uncoveredAcIds: string[] }> = {}
) =>
  CoverageResult.create({
    rate: 1.0,
    coveredAcCount: 1,
    totalAcCount: 1,
    uncoveredAcIds: [],
    ...overrides,
  });
```

補足:
- ファクトリ関数は `test-helpers.ts` へ追加する（既存エクスポートを壊さない）。
- 各ファクトリはデフォルト引数で有効な値オブジェクトを返すため、Arrange 節の記述量を最小化できる。
- 例外系テストでは `() =>` でラップしてから `expect(actual).toThrowError(...)` を使う。

---

## 3. テストケース詳細ロジック

### 3.1 `requirement-test-matrix.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createStoryMapping, createAcMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers';

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
```

---

### 3.2 `story-mapping.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createAcMapping, createTestReference, createStoryMapping } from '../../helpers/test-helpers';

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
```

---

### 3.3 `ac-mapping.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createTestReference, createAcMapping } from '../../helpers/test-helpers';

target('AcMapping', () => {

  describe('生成テスト', () => {
    // UT-ACM-001
    it('acId=AC-1 と TestReference 1件でインスタンスが生成されること', () => {
      // Arrange
      const ref = createTestReference();
      // Act
      const actual = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      // Assert
      expect(actual.acId).toBe('AC-1');
      expect(actual.testReferences).toHaveLength(1);
    });

    // UT-ACM-002
    it('testReferencesが空配列のとき未カバー状態でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = AcMapping.create({ acId: 'AC-1', testReferences: [] });
      // Assert
      expect(actual.testReferences).toHaveLength(0);
      expect(actual.isCovered()).toBe(false);
    });

    // UT-ACM-003
    it('acId=AC-100（3桁正整数）でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = AcMapping.create({ acId: 'AC-100', testReferences: [] });
      // Assert
      expect(actual.acId).toBe('AC-100');
    });
  });

  describe('制約テスト（acId形式）', () => {
    // UT-ACM-004
    it('acId=AC-0（ゼロ）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC-0', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-005
    it('acId=AC-01（ゼロパディング）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC-01', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-006
    it('acId=ac-1（小文字）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'ac-1', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-007
    it('acId=AC1（ハイフンなし）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC1', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-008
    it('acId=AC-（数字なし）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC-', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });

    // UT-ACM-009
    it('acId=AC--1（負数）のとき InvalidAcIdFormatError がthrowされること', () => {
      // Arrange
      const actual = () => AcMapping.create({ acId: 'AC--1', testReferences: [] });
      // Act / Assert
      expect(actual).toThrowError(InvalidAcIdFormatError);
    });
  });

  describe('等値性テスト', () => {
    // UT-ACM-010
    it('同一acId・同一testReferencesのとき equals が true を返すこと', () => {
      // Arrange
      const ref = createTestReference();
      const acm1 = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      const acm2 = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      // Act
      const actual = acm1.equals(acm2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-ACM-011
    it('異なるacIdのとき equals が false を返すこと', () => {
      // Arrange
      const ref = createTestReference();
      const acm1 = AcMapping.create({ acId: 'AC-1', testReferences: [ref] });
      const acm2 = AcMapping.create({ acId: 'AC-2', testReferences: [ref] });
      // Act
      const actual = acm1.equals(acm2);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-ACM-012
    it('同一acId・異なるtestReferencesのとき equals が false を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/harness/__tests__/unit/a.test.ts' });
      const ref2 = createTestReference({ filePath: 'scripts/harness/__tests__/unit/b.test.ts' });
      const acm1 = AcMapping.create({ acId: 'AC-1', testReferences: [ref1] });
      const acm2 = AcMapping.create({ acId: 'AC-1', testReferences: [ref2] });
      // Act
      const actual = acm1.equals(acm2);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('振る舞いテスト（isCovered）', () => {
    // UT-ACM-013
    it('testReferencesが1件あるとき isCovered が true を返すこと', () => {
      // Arrange
      const sut = createAcMapping('AC-1', [createTestReference()]);
      // Act
      const actual = sut.isCovered();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-ACM-014
    it('testReferencesが空配列のとき isCovered が false を返すこと', () => {
      // Arrange
      const sut = createAcMapping('AC-1', []);
      // Act
      const actual = sut.isCovered();
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.4 `test-reference.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createTestReference } from '../../helpers/test-helpers';

target('TestReference', () => {

  describe('生成テスト', () => {
    // UT-TR-001
    it('有効なfilePathとtestType=unit でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      // Assert
      expect(actual.filePath).toBe('scripts/foo.test.ts');
      expect(actual.testType).toBe('unit');
    });

    // UT-TR-002
    it('testType=it でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'it' });
      // Assert
      expect(actual.testType).toBe('it');
    });

    // UT-TR-003
    it('testType=scenario でインスタンスが生成されること', () => {
      // Arrange
      // Act
      const actual = TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'scenario' });
      // Assert
      expect(actual.testType).toBe('scenario');
    });
  });

  describe('制約テスト（filePath）', () => {
    // UT-TR-004
    it('filePathが空文字のとき EmptyFilePathError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: '', testType: 'unit' });
      // Act / Assert
      expect(actual).toThrowError(EmptyFilePathError);
    });

    // UT-TR-005
    it('filePathがスペースのみのとき EmptyFilePathError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: '  ', testType: 'unit' });
      // Act / Assert
      expect(actual).toThrowError(EmptyFilePathError);
    });
  });

  describe('制約テスト（testType）', () => {
    // UT-TR-006
    it('testType=e2e のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'e2e' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });

    // UT-TR-007
    it('testType=Unit（大文字）のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'Unit' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });

    // UT-TR-008
    it('testTypeが空文字のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: '' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });

    // UT-TR-009
    it('testType=integration のとき InvalidTestTypeError がthrowされること', () => {
      // Arrange
      const actual = () => TestReference.create({ filePath: 'scripts/foo.test.ts', testType: 'integration' });
      // Act / Assert
      expect(actual).toThrowError(InvalidTestTypeError);
    });
  });

  describe('等値性テスト', () => {
    // UT-TR-010
    it('同一filePath・同一testTypeのとき equals が true を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      // Act
      const actual = ref1.equals(ref2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-TR-011
    it('異なるfilePath・同一testTypeのとき equals が false を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/bar.test.ts', testType: 'unit' });
      // Act
      const actual = ref1.equals(ref2);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-TR-012
    it('同一filePath・異なるtestTypeのとき equals が false を返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/foo.test.ts', testType: 'it' });
      // Act
      const actual = ref1.equals(ref2);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.5 `coverage-result.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createCoverageResult, createAcMapping, createStoryMapping, createRequirementTestMatrix, createTestReference } from '../../helpers/test-helpers';

target('CoverageResult', () => {

  describe('生成テスト（CoverageCalculationService.calculate 経由）', () => {
    // UT-CVR-001
    it('totalAcCount=4, coveredAcCount=4 のとき rate=1.0、uncoveredAcIds=[] で生成されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs),
        createAcMapping('AC-2', refs),
        createAcMapping('AC-3', refs),
        createAcMapping('AC-4', refs),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });

    // UT-CVR-002
    it('totalAcCount=4, coveredAcCount=2 のとき rate=0.5、uncoveredAcIds=2件で生成されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs),
        createAcMapping('AC-2', refs),
        createAcMapping('AC-3', []),
        createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.5);
      expect(actual.uncoveredAcIds).toHaveLength(2);
    });

    // UT-CVR-003
    it('totalAcCount=4, coveredAcCount=0 のとき rate=0.0、uncoveredAcIds=4件で生成されること', () => {
      // Arrange
      const acMappings = [
        createAcMapping('AC-1', []),
        createAcMapping('AC-2', []),
        createAcMapping('AC-3', []),
        createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.0);
      expect(actual.uncoveredAcIds).toHaveLength(4);
    });

    // UT-CVR-004
    it('totalAcCount=0（空のmatrix）のとき rate=1.0（空は全網羅とみなす）で生成されること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([]);
      const svc = new CoverageCalculationService();
      // Act
      const actual = svc.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
    });
  });

  describe('制約テスト', () => {
    // UT-CVR-005
    it('coveredAcCount > totalAcCount の不正な状態で CoverageResult を直接構築するとエラーがthrowされること', () => {
      // Arrange
      const actual = () =>
        CoverageResult.create({ rate: 1.0, coveredAcCount: 5, totalAcCount: 4, uncoveredAcIds: [] });
      // Act / Assert
      expect(actual).toThrow();
    });

    // UT-CVR-006
    it('rate が 0.0〜1.0 の範囲外（例: 1.5）で直接構築するとエラーがthrowされること', () => {
      // Arrange
      const actual = () =>
        CoverageResult.create({ rate: 1.5, coveredAcCount: 1, totalAcCount: 1, uncoveredAcIds: [] });
      // Act / Assert
      expect(actual).toThrow();
    });
  });

  describe('等値性テスト', () => {
    // UT-CVR-007
    it('全フィールドが等しいCoverageResult同士で equals が true を返すこと', () => {
      // Arrange
      const cvr1 = createCoverageResult({ rate: 0.5, coveredAcCount: 1, totalAcCount: 2, uncoveredAcIds: ['AC-2'] });
      const cvr2 = createCoverageResult({ rate: 0.5, coveredAcCount: 1, totalAcCount: 2, uncoveredAcIds: ['AC-2'] });
      // Act
      const actual = cvr1.equals(cvr2);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-CVR-008
    it('rateが異なるCoverageResult同士で equals が false を返すこと', () => {
      // Arrange
      const cvr1 = createCoverageResult({ rate: 1.0, coveredAcCount: 1, totalAcCount: 1, uncoveredAcIds: [] });
      const cvr2 = createCoverageResult({ rate: 0.5, coveredAcCount: 1, totalAcCount: 2, uncoveredAcIds: ['AC-2'] });
      // Act
      const actual = cvr1.equals(cvr2);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('振る舞いテスト（meetsThreshold）', () => {
    // UT-CVR-009
    it('rate=0.9, threshold=0.9 のとき meetsThreshold が true を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.9, coveredAcCount: 9, totalAcCount: 10, uncoveredAcIds: ['AC-10'] });
      // Act
      const actual = sut.meetsThreshold(0.9);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-CVR-010
    it('rate=0.89, threshold=0.9 のとき meetsThreshold が false を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.89, coveredAcCount: 89, totalAcCount: 100, uncoveredAcIds: ['AC-90'] });
      // Act
      const actual = sut.meetsThreshold(0.9);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-CVR-011
    it('rate=1.0, threshold=0.95 のとき meetsThreshold が true を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 1.0, coveredAcCount: 1, totalAcCount: 1, uncoveredAcIds: [] });
      // Act
      const actual = sut.meetsThreshold(0.95);
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('振る舞いテスト（toPercentage）', () => {
    // UT-CVR-012
    it('rate=0.9 のとき toPercentage が 90 を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.9, coveredAcCount: 9, totalAcCount: 10, uncoveredAcIds: ['AC-10'] });
      // Act
      const actual = sut.toPercentage();
      // Assert
      expect(actual).toBe(90);
    });

    // UT-CVR-013
    it('rate=0.9999 のとき toPercentage が 99.99 を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.9999, coveredAcCount: 9999, totalAcCount: 10000, uncoveredAcIds: ['AC-10000'] });
      // Act
      const actual = sut.toPercentage();
      // Assert
      expect(actual).toBe(99.99);
    });

    // UT-CVR-014
    it('rate=0.0 のとき toPercentage が 0 を返すこと', () => {
      // Arrange
      const sut = createCoverageResult({ rate: 0.0, coveredAcCount: 0, totalAcCount: 1, uncoveredAcIds: ['AC-1'] });
      // Act
      const actual = sut.toPercentage();
      // Assert
      expect(actual).toBe(0);
    });
  });
});
```

---

### 3.6 `impact-analysis-result.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createTestReference } from '../../helpers/test-helpers';

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
```

---

### 3.7 `ac-coverage-gate-policy.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createAcMapping, createStoryMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers';

target('AcCoverageGatePolicy', () => {

  describe('正常系テスト', () => {
    // UT-ACGP-001
    it('全ACにTestReferenceが1件以上ある（1ストーリー2AC）とき check が passed=true、errors=[] を返すこと', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-002
    it('全ACにTestReferenceが1件以上ある（3ストーリー複数AC）とき check が passed=true、errors=[] を返すこと', () => {
      // Arrange
      const refs = [createTestReference()];
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', refs)]);
      const sm3 = createStoryMapping('H07-03', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs), createAcMapping('AC-3', refs)]);
      const matrix = createRequirementTestMatrix([sm1, sm2, sm3]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-003
    it('storyMappingsが空配列のとき check が passed=true、errors=[] を返すこと（ACなし=全AC網羅済み）', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-004
    it('acMappingsが空配列のStoryMappingのみのとき check が passed=true、errors=[] を返すこと', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });
  });

  describe('異常系テスト', () => {
    // UT-ACGP-005
    it('AC-1のTestReferenceが空（未カバー1件）のとき passed=false、errors に AC-1未カバーの HarnessError 1件が含まれること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });

    // UT-ACGP-006
    it('2ストーリーで各1件ずつ未カバーACがある場合 passed=false、errors が 2件であること', () => {
      // Arrange
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', [])]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', [])]);
      const matrix = createRequirementTestMatrix([sm1, sm2]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(2);
    });

    // UT-ACGP-007
    it('複数ACのうち1件だけ未カバーの場合 passed=false、errors に未カバーAC 1件のみが含まれること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [createAcMapping('AC-1', refs), createAcMapping('AC-2', [])];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });
  });

  describe('不変条件テスト', () => {
    // UT-ACGP-008
    it('passed=true のとき errors が空配列であること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [createTestReference()])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });

    // UT-ACGP-009
    it('passed=false のとき errors が1件以上存在すること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors.length).toBeGreaterThanOrEqual(1);
    });

    // UT-ACGP-010
    it('未カバーAC検出時に各 HarnessError の code が L3-004 であること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', [])])]);
      const sut = new AcCoverageGatePolicy();
      // Act
      const actual = sut.check(matrix);
      // Assert
      expect(actual.errors[0].code).toBe('L3-004');
    });
  });
});
```

---

### 3.8 `coverage-calculation-service.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, createAcMapping, createStoryMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers';

target('CoverageCalculationService', () => {

  describe('正常系テスト', () => {
    // UT-CCS-001
    it('全4ACがカバー済みのとき rate=1.0、coveredAcCount=4、totalAcCount=4、uncoveredAcIds=[] が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs), createAcMapping('AC-2', refs),
        createAcMapping('AC-3', refs), createAcMapping('AC-4', refs),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.coveredAcCount).toBe(4);
      expect(actual.totalAcCount).toBe(4);
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });

    // UT-CCS-002
    it('4ACのうち2件カバー済みのとき rate=0.5、coveredAcCount=2、totalAcCount=4、uncoveredAcIds=2件が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [
        createAcMapping('AC-1', refs), createAcMapping('AC-2', refs),
        createAcMapping('AC-3', []), createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.5);
      expect(actual.coveredAcCount).toBe(2);
      expect(actual.totalAcCount).toBe(4);
      expect(actual.uncoveredAcIds).toHaveLength(2);
    });

    // UT-CCS-003
    it('全ACが未カバー（4件）のとき rate=0.0、coveredAcCount=0、totalAcCount=4、uncoveredAcIds=4件が返されること', () => {
      // Arrange
      const acMappings = [
        createAcMapping('AC-1', []), createAcMapping('AC-2', []),
        createAcMapping('AC-3', []), createAcMapping('AC-4', []),
      ];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.0);
      expect(actual.coveredAcCount).toBe(0);
      expect(actual.totalAcCount).toBe(4);
      expect(actual.uncoveredAcIds).toHaveLength(4);
    });

    // UT-CCS-004
    it('storyMappingsが空配列のとき rate=1.0、coveredAcCount=0、totalAcCount=0、uncoveredAcIds=[] が返されること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.coveredAcCount).toBe(0);
      expect(actual.totalAcCount).toBe(0);
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });

    // UT-CCS-005
    it('2ストーリー × 2AC（全カバー）のとき rate=1.0、totalAcCount=4 が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', refs), createAcMapping('AC-2', refs)]);
      const matrix = createRequirementTestMatrix([sm1, sm2]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
      expect(actual.totalAcCount).toBe(4);
    });
  });

  describe('uncoveredAcIds 収集テスト', () => {
    // UT-CCS-006
    it('H07-01: AC-1未カバー、H07-02: AC-2未カバーのとき uncoveredAcIds に AC-1 と AC-2 が含まれること', () => {
      // Arrange
      const refs = [createTestReference()];
      const sm1 = createStoryMapping('H07-01', [createAcMapping('AC-1', []), createAcMapping('AC-2', refs)]);
      const sm2 = createStoryMapping('H07-02', [createAcMapping('AC-1', refs), createAcMapping('AC-2', [])]);
      const matrix = createRequirementTestMatrix([sm1, sm2]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.uncoveredAcIds).toContain('AC-1');
      expect(actual.uncoveredAcIds).toContain('AC-2');
    });

    // UT-CCS-007
    it('全ACがカバー済みのとき uncoveredAcIds が空配列であること', () => {
      // Arrange
      const refs = [createTestReference()];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', refs)])]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.uncoveredAcIds).toHaveLength(0);
    });
  });

  describe('境界値テスト', () => {
    // UT-CCS-008
    it('totalAcCount=1, coveredAcCount=1 のとき rate=1.0 が小数点以下4桁で保持されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', [createAcMapping('AC-1', refs)])]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(1.0);
    });

    // UT-CCS-009
    it('totalAcCount=3, coveredAcCount=1 のとき rate=0.3333（小数点以下4桁）が返されること', () => {
      // Arrange
      const refs = [createTestReference()];
      const acMappings = [createAcMapping('AC-1', refs), createAcMapping('AC-2', []), createAcMapping('AC-3', [])];
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01', acMappings)]);
      const sut = new CoverageCalculationService();
      // Act
      const actual = sut.calculate(matrix);
      // Assert
      expect(actual.rate).toBe(0.3333);
    });
  });
});
```

---

### 3.9 `impact-analysis-service.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, createAcMapping, createStoryMapping, createTestReference, createRequirementTestMatrix } from '../../helpers/test-helpers';

target('ImpactAnalysisService', () => {

  describe('正常系テスト', () => {
    // UT-IAS-001
    it('H07-01 に2つのAcMapping（各1件のTestReference）があるとき analyze が storyId=H07-01、directTests=2件のImpactAnalysisResultを返すこと', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts' });
      const ref2 = createTestReference({ filePath: 'scripts/__tests__/unit/b.test.ts' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref1]), createAcMapping('AC-2', [ref2])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.storyId).toBe('H07-01');
      expect(actual.directTests).toHaveLength(2);
    });

    // UT-IAS-002
    it('H07-01 の全ACがカバー済みのとき directMappingOnly=true のImpactAnalysisResultが返されること', () => {
      // Arrange
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [createTestReference()])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directMappingOnly).toBe(true);
    });

    // UT-IAS-003
    it('H07-01 のacMappingsが空配列のとき storyId=H07-01、directTests=[] のImpactAnalysisResultが返されること', () => {
      // Arrange
      const sm = createStoryMapping('H07-01', []);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.storyId).toBe('H07-01');
      expect(actual.directTests).toHaveLength(0);
    });
  });

  describe('異常系テスト（storyId未検出）', () => {
    // UT-IAS-004
    it('matrixに H07-01 のみ存在する状態で H07-99 を analyze すると directTests=[] の空ImpactAnalysisResultが返されること（エラーなし）', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01')]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-99');
      // Assert
      expect(actual.directTests).toHaveLength(0);
    });
  });

  describe('重複除去テスト', () => {
    // UT-IAS-005
    it('AC-1とAC-2に同一filePath・同一testTypeのTestReferenceが重複するとき directTests で重複が除去されて1件になること', () => {
      // Arrange
      const ref = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'unit' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref]), createAcMapping('AC-2', [ref])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directTests).toHaveLength(1);
    });

    // UT-IAS-006
    it('AC-1とAC-2に同一filePathだが異なるtestTypeのTestReferenceがある場合、両方のTestReferenceが含まれること', () => {
      // Arrange
      const ref1 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'unit' });
      const ref2 = createTestReference({ filePath: 'scripts/__tests__/unit/a.test.ts', testType: 'it' });
      const sm = createStoryMapping('H07-01', [createAcMapping('AC-1', [ref1]), createAcMapping('AC-2', [ref2])]);
      const matrix = createRequirementTestMatrix([sm]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directTests).toHaveLength(2);
    });
  });

  describe('不変条件テスト', () => {
    // UT-IAS-007
    it('どのstoryIdで analyze を呼んでも返却されるImpactAnalysisResultの directMappingOnly が常に true であること', () => {
      // Arrange
      const matrix = createRequirementTestMatrix([createStoryMapping('H07-01')]);
      const sut = new ImpactAnalysisService();
      // Act
      const actual = sut.analyze(matrix, 'H07-01');
      // Assert
      expect(actual.directMappingOnly).toBe(true);
    });
  });
});
```

---

### 3.10 `matrix-validation-service.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

// StoryRegistryPort モックファクトリ
const createStoryRegistryPort = (validStoryIds: string[]) => ({
  findAllStoryIds: vi.fn().mockResolvedValue(validStoryIds),
});

target('MatrixValidationService', () => {

  describe('storyId整合性テスト', () => {
    // UT-MVS-001
    it('validStoryIds=["H07-01"] で rawData の storyId="H07-01" のとき passed=true、validatedData=rawData が返されること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.validatedData).not.toBeNull();
    });

    // UT-MVS-002
    it('validStoryIds=["H07-01"] で rawData の storyId="H07-99"（未登録）のとき passed=false、errors に H07-99未登録の HarnessError が含まれること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-99', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });

    // UT-MVS-003
    it('validStoryIds=["H07-01","H07-02"] で rawData に両方のstoryIdが含まれるとき passed=true が返されること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01', 'H07-02']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        storyMappings: [
          { storyId: 'H07-01', acMappings: [] },
          { storyId: 'H07-02', acMappings: [] },
        ],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
    });

    // UT-MVS-004
    it('validStoryIds=[]（空） で rawData の storyId="H07-01" のとき passed=false、errors が 1件であること', async () => {
      // Arrange
      const port = createStoryRegistryPort([]);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });
  });

  describe('複数エラー収集テスト', () => {
    // UT-MVS-005
    it('validStoryIds=["H07-01"] で rawData に "H07-02","H07-03"（未登録2件）がある場合 passed=false、errors が 2件であること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = {
        storyMappings: [
          { storyId: 'H07-02', acMappings: [] },
          { storyId: 'H07-03', acMappings: [] },
        ],
      };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(2);
    });
  });

  describe('不変条件テスト', () => {
    // UT-MVS-006
    it('passed=true のとき validatedData が非null であること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.validatedData).not.toBeNull();
    });

    // UT-MVS-007
    it('passed=false のとき validatedData が null であること', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-99', acMappings: [] }] };
      // Act
      const actual = await sut.validate(rawData);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.validatedData).toBeNull();
    });
  });

  describe('StoryRegistryPort エラー伝播テスト', () => {
    // UT-MVS-008
    it('StoryRegistryPort が例外をthrow するとき validate がその例外をそのまま上位に伝播すること', async () => {
      // Arrange
      const port = { findAllStoryIds: vi.fn().mockRejectedValue(new Error('ポート接続エラー')) };
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };
      // Act
      const actual = () => sut.validate(rawData);
      // Assert
      await expect(actual()).rejects.toThrow('ポート接続エラー');
    });
  });
});
```

---

## 4. モック戦略

| ドメインサービス | ポート依存 | モック方針 |
|---|---|---|
| AcCoverageGatePolicy | なし | モック不要。RequirementTestMatrix を実体で直接渡す |
| CoverageCalculationService | なし | モック不要。純粋計算サービス |
| ImpactAnalysisService | なし | モック不要。RequirementTestMatrix を実体で直接渡す |
| MatrixValidationService | StoryRegistryPort | `vi.fn()` で `findAllStoryIds` をモック。`mockResolvedValue(string[])` で戻り値を制御 |

### StoryRegistryPort モック構造

```typescript
const createStoryRegistryPort = (validStoryIds: string[]) => ({
  findAllStoryIds: vi.fn().mockResolvedValue(validStoryIds),
});
```

エラー伝播テスト（UT-MVS-008）では `mockRejectedValue(new Error(...))` を使用する。

### VO・エンティティ・集約のモック方針

値オブジェクト（TestReference, AcMapping, CoverageResult, ImpactAnalysisResult）、エンティティ（StoryMapping）、集約（RequirementTestMatrix）はすべて実体をファクトリ関数で生成する。モックは使用しない。

---

## 5. 境界値テスト一覧

横断境界値（UT-BND-*）は対応するクラスのテストファイルに分散して記載する。

| ケースID | 対象 | 分散先ファイル | 入力 | 期待結果 |
|---|---|---|---|---|
| UT-BND-001 | AcMapping.acId | `ac-mapping.test.ts` | `AC-1`（最小正整数） | 有効として受け入れられる |
| UT-BND-002 | AcMapping.acId | `ac-mapping.test.ts` | `AC-0`（ゼロ） | InvalidAcIdFormatError がthrowされる |
| UT-BND-003 | AcMapping.acId | `ac-mapping.test.ts` | `AC-999`（大きい数値） | 有効として受け入れられる |
| UT-BND-004 | CoverageResult.rate | `coverage-result.test.ts` | 0.0（全AC未カバー） | rate=0.0 として保持される |
| UT-BND-005 | CoverageResult.rate | `coverage-result.test.ts` | 1.0（全AC網羅済み） | rate=1.0 として保持される |
| UT-BND-006 | CoverageResult.rate | `coverage-result.test.ts` | totalAcCount=0 | rate=1.0（空は全網羅とみなす） |
| UT-BND-007 | RequirementTestMatrix | `requirement-test-matrix.test.ts` | storyMappings 空配列 | インスタンスが正常に生成される |
| UT-BND-008 | StoryMapping | `story-mapping.test.ts` | acMappings 空配列 | インスタンスが正常に生成される |
| UT-BND-009 | AcMapping | `ac-mapping.test.ts` | testReferences 空配列 | インスタンスが正常に生成される（未カバー状態） |
| UT-BND-010 | ImpactAnalysisResult | `impact-analysis-result.test.ts` | directTests 空配列 | isEmpty()=true として扱われる |
| UT-BND-011 | TestReference.filePath | `test-reference.test.ts` | trim後に空文字になる入力（`"  "`） | EmptyFilePathError がthrowされる |
| UT-BND-012 | AcCoverageGatePolicy | `ac-coverage-gate-policy.test.ts` | 1件のみ未カバーAC | errors に1件のみ HarnessError が返される |
| UT-BND-013 | CoverageCalculationService | `coverage-calculation-service.test.ts` | totalAcCount=1, coveredAcCount=0 | rate=0.0 として計算される |
| UT-BND-014 | ImpactAnalysisService | `impact-analysis-service.test.ts` | storyId未検出の場合 | 例外なし・空ImpactAnalysisResultが返される |
| UT-BND-015 | MatrixValidationService | `matrix-validation-service.test.ts` | validStoryIds が空配列 | 全storyIdについてエラーが生成される |

### 境界値テスト対応ケースID一覧

- **UT-BND-001〜003**: UT-ACM-001（AC-1有効）、UT-ACM-004（AC-0無効）に対応。AC-999は UT-ACM-003 相当の追加ケース
- **UT-BND-004〜006**: UT-CVR-003（rate=0.0）、UT-CVR-001（rate=1.0）、UT-CVR-004（空matrix=rate 1.0）に対応
- **UT-BND-007〜009**: UT-RTM-002, UT-SM-002, UT-ACM-002 に対応
- **UT-BND-010**: UT-IAR-002 に対応
- **UT-BND-011**: UT-TR-005 に対応
- **UT-BND-012**: UT-ACGP-007 に対応
- **UT-BND-013**: UT-CCS-003 相当（totalAcCount=1 の縮退ケース）
- **UT-BND-014**: UT-IAS-004 に対応
- **UT-BND-015**: UT-MVS-004 に対応

---

## 6. テスト実行コマンド

### ユニット全体
```bash
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/
```

### ファイル単位
```bash
# 集約
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/requirement-test-matrix.test.ts

# エンティティ
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/story-mapping.test.ts

# 値オブジェクト
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/ac-mapping.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/test-reference.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/coverage-result.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-result.test.ts

# ドメインサービス
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/ac-coverage-gate-policy.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/coverage-calculation-service.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-service.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/matrix-validation-service.test.ts
```

### ウォッチモード
```bash
npx vitest scripts/harness/__tests__/unit/nyquist-validation/
```

## WI-365 実装突合レビュー記録（2026-08-06）

<!-- @work-item-id WI-365 -->

`p2:check-freshness` で error 判定（104 日経過）となったため、タイムスタンプ更新ではなく
**現行実装との突合レビュー**を実施した。以下は実測結果。

### 検証済み（記述と実装が一致）

- §1 の 10 パスはすべて実在。
- §2 のファクトリ `createTestReference` / `createAcMapping` / `createStoryMapping` /
  `createRequirementTestMatrix` / `createCoverageResult` は
  `scripts/harness/__tests__/helpers/test-helpers.ts` に文書どおりのシグネチャ・既定値で存在。
- §3.1 / 3.2 / 3.3 / 3.4 / 3.5 / 3.6 / 3.8 / 3.9 の全 `it()` タイトルが実テストと逐語一致。
- 振る舞いの実装確認: `RequirementTestMatrix` の INV-1 と `getAllStoryMappings` の localeCompare ソート、
  `TestReference` の trim と `['unit','it','scenario']` enum、`CoverageResult.create` の範囲・件数ガードと
  `meetsThreshold = rate >= threshold`、`toPercentage()` の切り捨て（0.9999 → 99.99）、
  `CoverageCalculationService` の `totalAcCount===0 → rate 1.0` と小数第 4 位丸め（1/3 → 0.3333）、
  `ImpactAnalysisResult` の重複排除キー `filePath::testType`、`directMappingOnly` が固定 `true`。
- §4 モック方針 / §5 境界値表 / §6 実行コマンドは現行コードと矛盾なし。

### 是正した記述

| 箇所 | 旧記述 | 実装 | 対応 |
|---|---|---|---|
| §1 `ac-coverage-gate-policy.test.ts` | 10 ケース | 14 ケース | 表を 14 に更新 |
| §1 `matrix-validation-service.test.ts` | 8 ケース | 12 ケース | 表を 12 に更新 |

### 未反映の実装差分（後続 WI 候補）

以下は事実として記録するに留め、本 WI では §3 本文の全面改稿を行わない
（改稿量が quick スコープを超えるため）。

1. **§3.7 AcCoverageGatePolicy**: WI-292 で追加された `Story coverage lifecycle` describe
   （planned story を非ブロッキング扱い / planned なのに testRefs がある場合 fail-closed /
   required→planned の後退を fail-closed / status と lifecycle 終端の不一致を fail-closed）
   の 4 ケースが未記載。`check()` が先に `hasValidCoverageLifecycle(sm)` を評価し、
   `coverageStatus === 'planned'` の story では未カバー AC を報告しない点も未記載。
2. **§3.10 MatrixValidationService**: `extractStoryMappings()` がスキーマ準拠の
   トップレベル `stories` 形式と旧 `storyMappings` 形式の双方を受け付ける点、
   および INV-1 storyId 重複をサービス内で検出する点（計 4 ケース）が未記載。
3. **§3.2 StoryMapping**: `StoryMappingCreateProps` は `coverageStatus?: 'planned' | 'required'`
   （既定 `'required'`）と `coverageLifecycle?: readonly StoryCoverageStatus[]`
   （既定 `[coverageStatus]`）も受け取り、エンティティは `coverageStatus` /
   `coverageLifecycle` / `testReferenceCount()` を公開する。文書の 2 引数形は
   既定値により今も有効だが、WI-292 の契約が見えない。
4. **§3.10 / §4 のポート名**: 正規のポート契約は `StoryRegistryPort { getValidStoryIds() }`。
   文書が使う `findAllStoryIds` は `StoryRegistryPortForValidation.findAllStoryIds?` という
   任意の後方互換エイリアス（存在すれば優先される）であり、正規名ではない。
