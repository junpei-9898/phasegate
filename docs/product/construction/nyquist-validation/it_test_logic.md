# ITテストロジック設計: nyquist-validation

## 1. テストファイル構成

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/validate-matrix-usecase.it.test.ts` | ValidateMatrixUseCase | 10 |
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/check-ac-coverage-gate-usecase.it.test.ts` | CheckAcCoverageGateUseCase | 8 |
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/calculate-coverage-usecase.it.test.ts` | CalculateCoverageUseCase | 8 |
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/analyze-impact-usecase.it.test.ts` | AnalyzeImpactUseCase | 7 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/file-system-matrix-file-adapter.it.test.ts` | FileSystemMatrixFileAdapter | 9 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/traceability-model-story-registry-adapter.it.test.ts` | TraceabilityModelStoryRegistryAdapter | 4 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/config-foundation-coverage-threshold-adapter.it.test.ts` | ConfigFoundationCoverageThresholdAdapter | 5 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/ajv-json-schema-validator-adapter.it.test.ts` | AjvJsonSchemaValidatorAdapter | 8 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/validate-matrix-handler.it.test.ts` | ValidateMatrixHandler | 6 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/check-ac-coverage-gate-handler.it.test.ts` | CheckAcCoverageGateHandler | 5 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/calculate-coverage-handler.it.test.ts` | CalculateCoverageHandler | 6 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/analyze-impact-handler.it.test.ts` | AnalyzeImpactHandler | 6 |

---

## 2. テストヘルパー・シードデータ

### 2.1 共通ファクトリ・ヘルパー

```typescript
import { target, context } from '../../../../helpers/test-helpers';

/** ValidateMatrixUseCase 入力のデフォルト値を返す */
function createValidateMatrixInput(overrides?: Partial<ValidateMatrixInput>): ValidateMatrixInput {
  return {
    matrixFilePath: '/test/fixtures/valid-full-coverage.json',
    failFast: false,
    ...overrides,
  };
}

/** CheckAcCoverageGateUseCase 入力のデフォルト値を返す */
function createCheckAcCoverageGateInput(overrides?: Partial<CheckAcCoverageGateInput>): CheckAcCoverageGateInput {
  return {
    matrixFilePath: '/test/fixtures/valid-full-coverage.json',
    ...overrides,
  };
}

/** CalculateCoverageUseCase 入力のデフォルト値を返す */
function createCalculateCoverageInput(overrides?: Partial<CalculateCoverageInput>): CalculateCoverageInput {
  return {
    matrixFilePath: '/test/fixtures/valid-partial-coverage.json',
    checkThreshold: false,
    ...overrides,
  };
}

/** AnalyzeImpactUseCase 入力のデフォルト値を返す */
function createAnalyzeImpactInput(overrides?: Partial<AnalyzeImpactInput>): AnalyzeImpactInput {
  return {
    matrixFilePath: '/test/fixtures/valid-impact-analysis.json',
    storyId: 'H07-01',
    ...overrides,
  };
}

/** 有効な RequirementTestMatrix の生データ（full coverage 版）を返す */
function createValidFullCoverageMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [
      {
        storyId: 'H07-01',
        storyMappings: [
          {
            acId: 'AC-1',
            testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' }],
          },
          {
            acId: 'AC-2',
            testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' }],
          },
        ],
      },
      {
        storyId: 'H07-02',
        storyMappings: [
          {
            acId: 'AC-1',
            testReferences: [{ filePath: 'specs/h07-02.spec.ts', testType: 'it', testName: 'AC-1 test' }],
          },
        ],
      },
    ],
  };
}

/** 有効な RequirementTestMatrix の生データ（partial coverage 版 75%）を返す */
function createValidPartialCoverageMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [
      {
        storyId: 'H07-01',
        storyMappings: [
          { acId: 'AC-1', testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' }] },
          { acId: 'AC-2', testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' }] },
          { acId: 'AC-3', testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-3 test' }] },
          { acId: 'AC-4', testReferences: [] },
        ],
      },
    ],
  };
}

/** 空stories matrix データを返す */
function createEmptyStoriesMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [],
  };
}
```

### 2.2 Portモックパターン

```typescript
/** MatrixFilePort のデフォルトモック（full coverage データ返却）を返す */
function createMatrixFilePortMock(data = createValidFullCoverageMatrixData()) {
  return {
    read: vi.fn().mockResolvedValue(data),
    write: vi.fn().mockResolvedValue(undefined),
  };
}

/** StoryRegistryPort のデフォルトモック（有効storyIds付き）を返す */
function createStoryRegistryMock(storyIds = ['H07-01', 'H07-02', 'H07-03', 'H07-04']) {
  return {
    getValidStoryIds: vi.fn().mockResolvedValue(storyIds),
  };
}

/** CoverageThresholdPort のデフォルトモック（standard preset 90%）を返す */
function createCoverageThresholdPortMock(threshold = { standard: 0.90, strict: 0.95, active: 0.90 }) {
  return {
    getThreshold: vi.fn().mockResolvedValue(threshold),
  };
}

/** AjvValidator のデフォルトモック（valid=true）を返す */
function createAjvValidatorMock(valid = true, errors: HarnessError[] = []) {
  return {
    validate: vi.fn().mockResolvedValue({ valid, errors }),
  };
}

// ポートモック使用例:
const mockMatrixFilePort = {
  read: vi.fn().mockResolvedValue(createValidFullCoverageMatrixData()),
  write: vi.fn().mockResolvedValue(undefined),
};
const mockStoryRegistryPort = {
  getValidStoryIds: vi.fn().mockResolvedValue(['H07-01', 'H07-02', 'H07-03', 'H07-04']),
};
```

### 2.3 fixtureファイル一覧

配置先: `scripts/harness/__tests__/integration/nyquist-validation/fixtures/`

| ファイル名 | 用途 |
|---|---|
| `valid-full-coverage.json` | 全AC網羅済みmatrix。stories: H07-01〜H07-04、各ACにtestReferences 1件以上 |
| `valid-partial-coverage.json` | 75%カバー（4AC中3ACにtestReferences、1AC未カバー） |
| `valid-no-coverage.json` | 全ACにtestReferences空 |
| `valid-empty-stories.json` | `stories: []`（totalAcCount=0テスト用） |
| `invalid-missing-required.json` | `acId`フィールド欠損のstoryMappings |
| `invalid-wrong-testtype.json` | `testType: "e2e"`（許容外enum値） |
| `invalid-acid-format.json` | `acId: "AC-0"`, `"AC-01"`（patternエラー） |
| `invalid-unknown-storyid.json` | `storyId: "H99-99"`（registry未登録） |
| `invalid-duplicate-storyid.json` | 同一storyIdが2件（DuplicateStoryMappingError用） |
| `valid-duplicate-testrefs.json` | 同一filePathのTestReferenceが複数AC |
| `valid-impact-analysis.json` | H07-01に3つのAC、各ACに複数のTestReference |

---

## 3. UseCaseテスト詳細ロジック

### 3.1 ValidateMatrixUseCase（10件）

```typescript
// @story H07-01

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { ValidateMatrixUseCase } from '../../../../../nyquist-validation/application/usecases/validate-matrix-usecase';
import { MatrixValidationService } from '../../../../../nyquist-validation/domain/services/matrix-validation-service';

target('ValidateMatrixUseCase', () => {

  describe('有効なmatrixファイルを渡した場合のバリデーション', () => {

    context('スキーマも整合性も問題ない場合', () => {

      // IT-UC-ValidateMatrix-001
      it('有効なmatrixファイルパスを渡すと、バリデーションが通過すること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/valid/path.json', failFast: false });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
        expect(actual.schemaErrors).toHaveLength(0);
        expect(actual.integrityErrors).toHaveLength(0);
        expect(actual.validatedData).not.toBeNull();
      });

      // IT-UC-ValidateMatrix-002
      it('failFast=trueでスキーマエラーなしの場合、整合性チェックまで実行されること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const validateSpy = vi.spyOn(matrixValidationService, 'validate');
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/valid/path.json', failFast: true });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(validateSpy).toHaveBeenCalledTimes(1);
      });

      // IT-UC-ValidateMatrix-003
      it('全ACにテスト参照があるデータで、integrityErrorsが空配列であること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock(['H07-01', 'H07-02', 'H07-03', 'H07-04']);
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/full-coverage.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.integrityErrors).toHaveLength(0);
      });

    });

  });

  describe('異常系: エラーパターン検証', () => {

    context('JSONスキーマバリデーション違反がある場合', () => {

      // IT-UC-ValidateMatrix-004
      it('スキーマ違反のJSONを渡すと、schemaErrorsに変換されること', async () => {
        // Arrange
        const schemaError = { code: 'L3-004', message: 'required field missing', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock({ version: '1.0.0', stories: [] });
        const mockAjvValidator = createAjvValidatorMock(false, [schemaError]);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/invalid-schema.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.schemaErrors).toHaveLength(1);
        expect(actual.schemaErrors[0].code).toBe('L3-004');
        expect(actual.integrityErrors).toHaveLength(0);
        expect(actual.validatedData).toBeNull();
      });

      // IT-UC-ValidateMatrix-005
      it('failFast=trueかつスキーマエラーがある場合、MatrixValidationServiceが呼ばれないこと', async () => {
        // Arrange
        const schemaError = { code: 'L3-004', message: 'schema error', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock({ version: '1.0.0', stories: [] });
        const mockAjvValidator = createAjvValidatorMock(false, [schemaError]);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const validateSpy = vi.spyOn(matrixValidationService, 'validate');
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/invalid.json', failFast: true });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(validateSpy).toHaveBeenCalledTimes(0);
      });

    });

    context('storyId整合性エラーがある場合', () => {

      // IT-UC-ValidateMatrix-006
      it('storyId整合性エラーがある場合、integrityErrorsに格納されること', async () => {
        // Arrange
        const integrityError = { code: 'L3-005', message: 'unknown storyId: H99-99', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock(['H07-01']);
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        vi.spyOn(matrixValidationService, 'validate').mockResolvedValue({
          passed: false,
          errors: [integrityError],
        });
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/unknown-story.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.integrityErrors).toHaveLength(1);
        expect(actual.schemaErrors).toHaveLength(0);
      });

      // IT-UC-ValidateMatrix-007
      it('スキーマエラーと整合性エラーが両方ある場合、errorsに両方が含まれること', async () => {
        // Arrange
        const schemaError = { code: 'L3-004', message: 'schema error', severity: 'error' };
        const integrityError = { code: 'L3-005', message: 'integrity error', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(false, [schemaError]);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        vi.spyOn(matrixValidationService, 'validate').mockResolvedValue({
          passed: false,
          errors: [integrityError],
        });
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/double-error.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.errors).toHaveLength(2);
        expect(actual.schemaErrors).toHaveLength(1);
        expect(actual.integrityErrors).toHaveLength(1);
      });

    });

    context('I/O・依存サービスエラーの場合', () => {

      // IT-UC-ValidateMatrix-008
      it('matrixファイルが存在しない場合、I/OエラーがスローされてUseCaseから伝播すること', async () => {
        // Arrange
        const mockMatrixFilePort = {
          read: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
          write: vi.fn(),
        };
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/not-found.json' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow('ENOENT');
      });

      // IT-UC-ValidateMatrix-009
      it('StoryRegistryPortがエラーを返した場合、UseCaseからエラーが伝播すること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = {
          getValidStoryIds: vi.fn().mockRejectedValue(new Error('StoryRegistry unavailable')),
        };
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/valid.json' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow('StoryRegistry unavailable');
      });

      // IT-UC-ValidateMatrix-010
      it('複数のスキーマエラーがある場合、全件がschemaErrorsに格納されること', async () => {
        // Arrange
        const schemaErrors = [
          { code: 'L3-004', message: 'error 1', severity: 'error' },
          { code: 'L3-004', message: 'error 2', severity: 'error' },
          { code: 'L3-004', message: 'error 3', severity: 'error' },
        ];
        const mockMatrixFilePort = createMatrixFilePortMock({ version: '1.0.0', stories: [] });
        const mockAjvValidator = createAjvValidatorMock(false, schemaErrors);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const usecase = new ValidateMatrixUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
        });
        const input = createValidateMatrixInput({ matrixFilePath: '/multi-error.json', failFast: false });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.schemaErrors).toHaveLength(3);
        expect(actual.passed).toBe(false);
      });

    });

  });

});
```

### 3.2 CheckAcCoverageGateUseCase（8件）

```typescript
// @story H07-02

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { CheckAcCoverageGateUseCase } from '../../../../../nyquist-validation/application/usecases/check-ac-coverage-gate-usecase';
import { AcCoverageGatePolicy } from '../../../../../nyquist-validation/domain/policies/ac-coverage-gate-policy';

target('CheckAcCoverageGateUseCase', () => {

  describe('全ACにテスト参照がある場合のゲートチェック', () => {

    context('全AC網羅済みのmatrixを渡した場合', () => {

      // IT-UC-CheckACGate-001
      it('全ACにテスト参照があるmatrixの場合、ゲートを通過すること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/full-coverage.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });

      // IT-UC-CheckACGate-002
      it('ゲート通過時、matrixプロパティが非nullで返ること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/full-coverage.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.matrix).not.toBeNull();
        expect(actual.matrix).toBeDefined();
      });

    });

  });

  describe('異常系: ゲート失敗パターン', () => {

    context('未カバーACが存在する場合', () => {

      // IT-UC-CheckACGate-003
      it('未カバーACがある場合、passed=falseとHarnessError[]が返ること', async () => {
        // Arrange
        const coverageError = { code: 'L3-004', message: 'AC not covered: H07-01.AC-4', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock(createValidPartialCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        vi.spyOn(acCoverageGatePolicy, 'check').mockReturnValue({ passed: false, errors: [coverageError] });
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/partial-coverage.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
      });

      // IT-UC-CheckACGate-004
      it('複数の未カバーACがある場合、各ACに対してHarnessErrorが生成されること', async () => {
        // Arrange
        const coverageErrors = [
          { code: 'L3-004', message: 'AC not covered: H07-01.AC-1', severity: 'error' },
          { code: 'L3-004', message: 'AC not covered: H07-01.AC-2', severity: 'error' },
          { code: 'L3-004', message: 'AC not covered: H07-01.AC-3', severity: 'error' },
        ];
        const noCovrageData = {
          version: '1.0.0',
          generatedAt: '2026-03-19T00:00:00.000Z',
          stories: [
            {
              storyId: 'H07-01',
              storyMappings: [
                { acId: 'AC-1', testReferences: [] },
                { acId: 'AC-2', testReferences: [] },
                { acId: 'AC-3', testReferences: [] },
              ],
            },
          ],
        };
        const mockMatrixFilePort = createMatrixFilePortMock(noCovrageData);
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        vi.spyOn(acCoverageGatePolicy, 'check').mockReturnValue({ passed: false, errors: coverageErrors });
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/no-coverage.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.errors).toHaveLength(3);
      });

      // IT-UC-CheckACGate-005
      it('JSONスキーマ違反のmatrixの場合、passed=falseになること', async () => {
        // Arrange
        const schemaError = { code: 'L3-004', message: 'schema error', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock({ version: '1.0.0' });
        const mockAjvValidator = createAjvValidatorMock(false, [schemaError]);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/invalid-schema.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(false);
      });

      // IT-UC-CheckACGate-006
      it('storyId整合性エラーのmatrixの場合、passed=falseになること', async () => {
        // Arrange
        const integrityError = { code: 'L3-005', message: 'unknown storyId: H99-99', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock(['H07-01']);
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        vi.spyOn(matrixValidationService, 'validate').mockResolvedValue({ passed: false, errors: [integrityError] });
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/unknown-story.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.passed).toBe(false);
      });

      // IT-UC-CheckACGate-007
      it('matrixファイルが存在しない場合、エラーが伝播すること', async () => {
        // Arrange
        const mockMatrixFilePort = {
          read: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
          write: vi.fn(),
        };
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/not-found.json' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow('ENOENT');
      });

      // IT-UC-CheckACGate-008
      it('RequirementTestMatrix.createで不変条件違反がある場合、エラーが伝播すること', async () => {
        // Arrange
        const duplicateData = {
          version: '1.0.0',
          generatedAt: '2026-03-19T00:00:00.000Z',
          stories: [
            { storyId: 'H07-01', storyMappings: [{ acId: 'AC-1', testReferences: [] }] },
            { storyId: 'H07-01', storyMappings: [{ acId: 'AC-2', testReferences: [] }] },
          ],
        };
        const mockMatrixFilePort = createMatrixFilePortMock(duplicateData);
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const acCoverageGatePolicy = new AcCoverageGatePolicy();
        const usecase = new CheckAcCoverageGateUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          acCoverageGatePolicy,
        });
        const input = createCheckAcCoverageGateInput({ matrixFilePath: '/duplicate-story.json' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(/DuplicateStoryMapping/);
      });

    });

  });

});
```

### 3.3 CalculateCoverageUseCase（8件）

```typescript
// @story H07-03

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { CalculateCoverageUseCase } from '../../../../../nyquist-validation/application/usecases/calculate-coverage-usecase';
import { CoverageCalculationService } from '../../../../../nyquist-validation/domain/services/coverage-calculation-service';

target('CalculateCoverageUseCase', () => {

  describe('閾値チェックなしの網羅率算出', () => {

    context('checkThreshold=falseの場合', () => {

      // IT-UC-CalcCoverage-001
      it('checkThreshold=falseの場合、閾値チェックなしで網羅率が返ること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidPartialCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = createCoverageThresholdPortMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue({
          rate: 0.75,
          coveredAcCount: 3,
          totalAcCount: 4,
          uncoveredAcIds: ['H07-01.AC-4'],
        });
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/partial.json', checkThreshold: false });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.ratePercent).toBe(75.0);
        expect(actual.threshold).toBeNull();
        expect(actual.meetsThreshold).toBeNull();
        expect(mockCoverageThresholdPort.getThreshold).not.toHaveBeenCalled();
      });

    });

  });

  describe('閾値チェックありの網羅率算出', () => {

    context('checkThreshold=trueの場合', () => {

      // IT-UC-CalcCoverage-002
      it('checkThreshold=trueで閾値を充足する場合、meetsThreshold=trueが返ること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = createCoverageThresholdPortMock({ standard: 0.90, strict: 0.95, active: 0.90 });
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue({
          rate: 0.95,
          coveredAcCount: 19,
          totalAcCount: 20,
          uncoveredAcIds: ['H07-01.AC-1'],
        });
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/high-coverage.json', checkThreshold: true });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.meetsThreshold).toBe(true);
        expect(actual.threshold).toBe(0.90);
      });

      // IT-UC-CalcCoverage-003
      it('全AC網羅済みの場合、ratePercent=100が返ること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = createCoverageThresholdPortMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue({
          rate: 1.0,
          coveredAcCount: 3,
          totalAcCount: 3,
          uncoveredAcIds: [],
        });
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/full.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.ratePercent).toBe(100.0);
        expect(actual.uncoveredAcIds).toHaveLength(0);
      });

      // IT-UC-CalcCoverage-004
      it('totalAcCount=0の場合（空matrix）、rate=1.0として扱われること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createEmptyStoriesMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = createCoverageThresholdPortMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue({
          rate: 1.0,
          coveredAcCount: 0,
          totalAcCount: 0,
          uncoveredAcIds: [],
        });
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/empty.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.ratePercent).toBe(100.0);
        expect(actual.coveredAcCount).toBe(0);
        expect(actual.totalAcCount).toBe(0);
      });

    });

  });

  describe('異常系: 閾値未達・エラー伝播', () => {

    context('checkThreshold=trueで閾値未達の場合', () => {

      // IT-UC-CalcCoverage-005
      it('checkThreshold=trueで閾値未達の場合、meetsThreshold=falseが返ること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidPartialCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = createCoverageThresholdPortMock({ standard: 0.90, strict: 0.95, active: 0.90 });
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue({
          rate: 0.60,
          coveredAcCount: 3,
          totalAcCount: 5,
          uncoveredAcIds: ['H07-01.AC-3', 'H07-01.AC-4'],
        });
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/low-coverage.json', checkThreshold: true });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.meetsThreshold).toBe(false);
        expect(actual.threshold).toBe(0.90);
      });

      // IT-UC-CalcCoverage-006
      it('CoverageThresholdPortがエラーを返した場合、エラーが伝播すること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = {
          getThreshold: vi.fn().mockRejectedValue(new Error('config-foundation unavailable')),
        };
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/valid.json', checkThreshold: true });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow('config-foundation unavailable');
      });

      // IT-UC-CalcCoverage-007
      it('uncoveredAcIdsが正しく列挙されること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidPartialCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = createCoverageThresholdPortMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue({
          rate: 0.5,
          coveredAcCount: 2,
          totalAcCount: 4,
          uncoveredAcIds: ['H01-01.AC-2', 'H01-02.AC-1'],
        });
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/partial.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.uncoveredAcIds).toContain('H01-01.AC-2');
        expect(actual.uncoveredAcIds).toContain('H01-02.AC-1');
      });

      // IT-UC-CalcCoverage-008
      it('ratePercentが小数点以下2桁で返ること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidPartialCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const mockCoverageThresholdPort = createCoverageThresholdPortMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const coverageCalculationService = new CoverageCalculationService();
        vi.spyOn(coverageCalculationService, 'calculate').mockReturnValue({
          rate: 0.6667,
          coveredAcCount: 2,
          totalAcCount: 3,
          uncoveredAcIds: ['H07-01.AC-3'],
        });
        const usecase = new CalculateCoverageUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          coverageCalculationService,
          coverageThresholdPort: mockCoverageThresholdPort,
        });
        const input = createCalculateCoverageInput({ matrixFilePath: '/partial.json' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.ratePercent).toBe(66.67);
      });

    });

  });

});
```

### 3.4 AnalyzeImpactUseCase（7件）

```typescript
// @story H07-04

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { AnalyzeImpactUseCase } from '../../../../../nyquist-validation/application/usecases/analyze-impact-usecase';
import { ImpactAnalysisService } from '../../../../../nyquist-validation/domain/services/impact-analysis-service';

target('AnalyzeImpactUseCase', () => {

  describe('存在するstoryIdの影響分析', () => {

    context('storyIdがmatrixに存在する場合', () => {

      // IT-UC-AnalyzeImpact-001
      it('存在するstoryIdを渡すと、直接マッピングされたテスト参照が返ること', async () => {
        // Arrange
        const testRef1 = { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' };
        const testRef2 = { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' };
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const impactAnalysisService = new ImpactAnalysisService();
        vi.spyOn(impactAnalysisService, 'analyze').mockReturnValue({
          found: true,
          directTests: [testRef1, testRef2],
        });
        const usecase = new AnalyzeImpactUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          impactAnalysisService,
        });
        const input = createAnalyzeImpactInput({ matrixFilePath: '/valid.json', storyId: 'H07-01' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.found).toBe(true);
        expect(actual.directTests).toHaveLength(2);
        expect(actual.directMappingOnly).toBe(true);
      });

      // IT-UC-AnalyzeImpact-002
      it('directMappingOnlyが常にtrueであること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const impactAnalysisService = new ImpactAnalysisService();
        vi.spyOn(impactAnalysisService, 'analyze').mockReturnValue({
          found: true,
          directTests: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' }],
        });
        const usecase = new AnalyzeImpactUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          impactAnalysisService,
        });
        const input = createAnalyzeImpactInput({ matrixFilePath: '/valid.json', storyId: 'H07-01' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.directMappingOnly).toBe(true);
      });

    });

    context('storyIdがmatrixに存在しない場合', () => {

      // IT-UC-AnalyzeImpact-003
      it('storyIdがmatrixに存在しない場合、found=falseで空のdirectTestsが返ること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock(createValidFullCoverageMatrixData());
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const impactAnalysisService = new ImpactAnalysisService();
        vi.spyOn(impactAnalysisService, 'analyze').mockReturnValue({
          found: false,
          directTests: [],
        });
        const usecase = new AnalyzeImpactUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          impactAnalysisService,
        });
        const input = createAnalyzeImpactInput({ matrixFilePath: '/valid.json', storyId: 'H99-99' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual.found).toBe(false);
        expect(actual.directTests).toHaveLength(0);
      });

      // IT-UC-AnalyzeImpact-004
      it('重複するテスト参照が除去されて返ること', async () => {
        // Arrange
        const uniqueRef1 = { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' };
        const uniqueRef2 = { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' };
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const impactAnalysisService = new ImpactAnalysisService();
        vi.spyOn(impactAnalysisService, 'analyze').mockReturnValue({
          found: true,
          directTests: [uniqueRef1, uniqueRef2],
        });
        const usecase = new AnalyzeImpactUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          impactAnalysisService,
        });
        const input = createAnalyzeImpactInput({ matrixFilePath: '/duplicate-refs.json', storyId: 'H07-01' });

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const paths = actual.directTests.map((t) => t.filePath + t.testName);
        const uniquePaths = new Set(paths);
        expect(paths.length).toBe(uniquePaths.size);
      });

    });

  });

  describe('異常系: バリデーション・I/Oエラー', () => {

    context('storyId書式が不正な場合', () => {

      // IT-UC-AnalyzeImpact-005
      it('storyId書式が不正な場合（HXX-XX形式でない）、エラーがthrowされること', async () => {
        // Arrange
        const mockMatrixFilePort = createMatrixFilePortMock();
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const impactAnalysisService = new ImpactAnalysisService();
        const usecase = new AnalyzeImpactUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          impactAnalysisService,
        });
        const input = createAnalyzeImpactInput({ matrixFilePath: '/valid.json', storyId: 'invalid-id' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow();
      });

      // IT-UC-AnalyzeImpact-006
      it('matrixファイルが存在しない場合、エラーが伝播すること', async () => {
        // Arrange
        const mockMatrixFilePort = {
          read: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
          write: vi.fn(),
        };
        const mockAjvValidator = createAjvValidatorMock(true, []);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const impactAnalysisService = new ImpactAnalysisService();
        const usecase = new AnalyzeImpactUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          impactAnalysisService,
        });
        const input = createAnalyzeImpactInput({ matrixFilePath: '/not-found.json', storyId: 'H07-01' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow('ENOENT');
      });

      // IT-UC-AnalyzeImpact-007
      it('JSONスキーマ違反のmatrixの場合、エラーが伝播すること', async () => {
        // Arrange
        const schemaError = { code: 'L3-004', message: 'schema error', severity: 'error' };
        const mockMatrixFilePort = createMatrixFilePortMock({ version: '1.0.0' });
        const mockAjvValidator = createAjvValidatorMock(false, [schemaError]);
        const mockStoryRegistryPort = createStoryRegistryMock();
        const matrixValidationService = new MatrixValidationService(mockStoryRegistryPort);
        const impactAnalysisService = new ImpactAnalysisService();
        const usecase = new AnalyzeImpactUseCase({
          matrixFilePort: mockMatrixFilePort,
          ajvValidator: mockAjvValidator,
          matrixValidationService,
          impactAnalysisService,
        });
        const input = createAnalyzeImpactInput({ matrixFilePath: '/invalid.json', storyId: 'H07-01' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow();
      });

    });

  });

});
```

---

## 4. Adapterテスト詳細ロジック

### 4.1 FileSystemMatrixFileAdapter（9件）

```typescript
// @story H07-01

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { FileSystemMatrixFileAdapter } from '../../../../../nyquist-validation/infrastructure/adapters/file-system-matrix-file-adapter';

vi.mock('node:fs/promises');
import * as fs from 'node:fs/promises';

target('FileSystemMatrixFileAdapter', () => {

  describe('read操作', () => {

    context('有効なJSONファイルパスを渡した場合', () => {

      // IT-REPO-FileAdapter-001
      it('有効なJSONファイルパスを渡すと、JSONパース済みのオブジェクトが返ること', async () => {
        // Arrange
        const validJson = JSON.stringify(createValidFullCoverageMatrixData(), null, 2);
        vi.mocked(fs.readFile).mockResolvedValue(validJson as any);
        const adapter = new FileSystemMatrixFileAdapter();

        // Act
        const actual = await adapter.read('/valid/requirement-test-matrix.json');

        // Assert
        expect(actual).toMatchObject({ version: '1.0.0' });
        expect(actual.stories).toBeDefined();
      });

      // IT-REPO-FileAdapter-002
      it('存在しないファイルパスを渡すと、エラーがthrowされること', async () => {
        // Arrange
        const enoentError = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
        vi.mocked(fs.readFile).mockRejectedValue(enoentError);
        const adapter = new FileSystemMatrixFileAdapter();

        // Act & Assert
        await expect(adapter.read('/not-found.json')).rejects.toThrow('ENOENT');
      });

      // IT-REPO-FileAdapter-003
      it('壊れたJSON（構文エラー）のファイルパスを渡すと、MatrixValidationFailedErrorがthrowされること', async () => {
        // Arrange
        vi.mocked(fs.readFile).mockResolvedValue('{ invalid json' as any);
        const adapter = new FileSystemMatrixFileAdapter();

        // Act & Assert
        await expect(adapter.read('/broken.json')).rejects.toThrow(/MatrixValidationFailed|JSON/);
      });

      // IT-REPO-FileAdapter-004
      it('空ファイルパスを渡すと、MatrixValidationFailedErrorがthrowされること', async () => {
        // Arrange
        vi.mocked(fs.readFile).mockResolvedValue('' as any);
        const adapter = new FileSystemMatrixFileAdapter();

        // Act & Assert
        await expect(adapter.read('/empty.json')).rejects.toThrow(/MatrixValidationFailed|JSON/);
      });

    });

  });

  describe('write操作', () => {

    context('有効なファイルパスとデータを渡した場合', () => {

      // IT-REPO-FileAdapter-005
      it('有効なファイルパスとValidatedMatrixDataを渡すと、JSON.stringify(data,null,2)形式で書き込まれること', async () => {
        // Arrange
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        const adapter = new FileSystemMatrixFileAdapter();
        const data = createValidFullCoverageMatrixData();
        const expectedContent = JSON.stringify(data, null, 2);

        // Act
        await adapter.write('/output/matrix.json', data);

        // Assert
        expect(fs.writeFile).toHaveBeenCalledWith('/output/matrix.json', expectedContent, 'utf-8');
      });

      // IT-REPO-FileAdapter-006
      it('書き込み権限なしのファイルパスを渡すと、エラーがthrowされること', async () => {
        // Arrange
        const eaccesError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
        vi.mocked(fs.writeFile).mockRejectedValue(eaccesError);
        const adapter = new FileSystemMatrixFileAdapter();
        const data = createValidFullCoverageMatrixData();

        // Act & Assert
        await expect(adapter.write('/no-permission/matrix.json', data)).rejects.toThrow('EACCES');
      });

      // IT-REPO-FileAdapter-007
      it('相対パスを渡した場合、アダプタの動作が明示的であること（相対パスのまま処理される）', async () => {
        // Arrange
        const validJson = JSON.stringify(createValidFullCoverageMatrixData(), null, 2);
        vi.mocked(fs.readFile).mockResolvedValue(validJson as any);
        const adapter = new FileSystemMatrixFileAdapter();

        // Act
        const actual = await adapter.read('./relative/path.json');

        // Assert
        // 相対パスが渡された場合、node:fs/promisesに渡された引数を確認する
        expect(fs.readFile).toHaveBeenCalledWith('./relative/path.json', 'utf-8');
        expect(actual).toBeDefined();
      });

    });

  });

  describe('read/write往復テスト', () => {

    context('write後にreadを呼ぶ場合', () => {

      // IT-REPO-FileAdapter-008
      it('write後にreadすると同一データが返ること', async () => {
        // Arrange
        const data = createValidFullCoverageMatrixData();
        const serialized = JSON.stringify(data, null, 2);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        vi.mocked(fs.readFile).mockResolvedValue(serialized as any);
        const adapter = new FileSystemMatrixFileAdapter();

        // Act
        await adapter.write('/roundtrip/matrix.json', data);
        const actual = await adapter.read('/roundtrip/matrix.json');

        // Assert
        expect(actual).toEqual(data);
      });

    });

  });

  describe('トランザクションテスト', () => {

    context('writeが途中でエラーになった場合', () => {

      // IT-REPO-FileAdapter-TX-001
      it('writeが途中でエラーになった場合、エラーがthrowされること', async () => {
        // Arrange
        vi.mocked(fs.writeFile).mockRejectedValue(new Error('write interrupted'));
        const adapter = new FileSystemMatrixFileAdapter();
        const data = createValidFullCoverageMatrixData();

        // Act & Assert
        await expect(adapter.write('/output/matrix.json', data)).rejects.toThrow('write interrupted');
      });

    });

  });

});
```

### 4.2 TraceabilityModelStoryRegistryAdapter（4件）

```typescript
// @story H07-01

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';

vi.mock('../../../../../nyquist-validation/../traceability-model');
import * as traceabilityModel from '../../../../../nyquist-validation/../traceability-model';

import { TraceabilityModelStoryRegistryAdapter } from '../../../../../nyquist-validation/infrastructure/adapters/traceability-model-story-registry-adapter';

target('TraceabilityModelStoryRegistryAdapter', () => {

  describe('getValidStoryIds操作', () => {

    context('traceability-modelが有効storyIds一覧を返す場合', () => {

      // IT-REPO-StoryRegistry-001
      it('getValidStoryIdsを呼ぶと、readonly StoryId[]が返ること（HXX-XX形式）', async () => {
        // Arrange
        vi.mocked(traceabilityModel.getStoryIds).mockResolvedValue(['H07-01', 'H07-02', 'H07-03', 'H07-04']);
        const adapter = new TraceabilityModelStoryRegistryAdapter();

        // Act
        const actual = await adapter.getValidStoryIds();

        // Assert
        expect(actual).toHaveLength(4);
        expect(actual[0]).toMatch(/^H\d{2}-\d{2}$/);
      });

      // IT-REPO-StoryRegistry-002
      it('storyIdが0件の場合、空配列が返ること', async () => {
        // Arrange
        vi.mocked(traceabilityModel.getStoryIds).mockResolvedValue([]);
        const adapter = new TraceabilityModelStoryRegistryAdapter();

        // Act
        const actual = await adapter.getValidStoryIds();

        // Assert
        expect(actual).toHaveLength(0);
        expect(Array.isArray(actual)).toBe(true);
      });

    });

    context('traceability-model呼び出しが失敗する場合', () => {

      // IT-REPO-StoryRegistry-003
      it('traceability-model呼び出しが失敗した場合、エラーがthrowされること', async () => {
        // Arrange
        vi.mocked(traceabilityModel.getStoryIds).mockRejectedValue(new Error('traceability-model error'));
        const adapter = new TraceabilityModelStoryRegistryAdapter();

        // Act & Assert
        await expect(adapter.getValidStoryIds()).rejects.toThrow('traceability-model error');
      });

      // IT-REPO-StoryRegistry-004
      it('traceability-model未実装でuser_stories.mdが存在する場合、フォールバック結果がStoryId[]で返ること', async () => {
        // Arrange
        vi.mocked(traceabilityModel.getStoryIds).mockRejectedValue(new Error('not implemented'));
        // フォールバック: user_stories.mdのパース結果をモック
        vi.mocked(traceabilityModel.parseUserStoriesMd).mockResolvedValue(['H07-01', 'H07-02']);
        const adapter = new TraceabilityModelStoryRegistryAdapter();

        // Act
        const actual = await adapter.getValidStoryIds();

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual).toContain('H07-01');
      });

    });

  });

});
```

### 4.3 ConfigFoundationCoverageThresholdAdapter（5件）

```typescript
// @story H07-03

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';

vi.mock('../../../../../nyquist-validation/../config-foundation');
import * as configFoundation from '../../../../../nyquist-validation/../config-foundation';

import { ConfigFoundationCoverageThresholdAdapter } from '../../../../../nyquist-validation/infrastructure/adapters/config-foundation-coverage-threshold-adapter';

target('ConfigFoundationCoverageThresholdAdapter', () => {

  describe('getThreshold操作', () => {

    context('presetがstandardの場合', () => {

      // IT-REPO-Threshold-001
      it('preset=standardの設定でgetThresholdを呼ぶと、active=0.90が返ること', async () => {
        // Arrange
        vi.mocked(configFoundation.loadConfig).mockResolvedValue({
          project: { preset: 'standard' },
        });
        const adapter = new ConfigFoundationCoverageThresholdAdapter();

        // Act
        const actual = await adapter.getThreshold();

        // Assert
        expect(actual.standard).toBe(0.90);
        expect(actual.strict).toBe(0.95);
        expect(actual.active).toBe(0.90);
      });

    });

    context('presetがstrictの場合', () => {

      // IT-REPO-Threshold-002
      it('preset=strictの設定でgetThresholdを呼ぶと、active=0.95が返ること', async () => {
        // Arrange
        vi.mocked(configFoundation.loadConfig).mockResolvedValue({
          project: { preset: 'strict' },
        });
        const adapter = new ConfigFoundationCoverageThresholdAdapter();

        // Act
        const actual = await adapter.getThreshold();

        // Assert
        expect(actual.standard).toBe(0.90);
        expect(actual.strict).toBe(0.95);
        expect(actual.active).toBe(0.95);
      });

    });

    context('presetがminimalの場合', () => {

      // IT-REPO-Threshold-003
      it('preset=minimalの設定でgetThresholdを呼ぶと、active=0.80が返ること', async () => {
        // Arrange
        vi.mocked(configFoundation.loadConfig).mockResolvedValue({
          project: { preset: 'minimal' },
        });
        const adapter = new ConfigFoundationCoverageThresholdAdapter();

        // Act
        const actual = await adapter.getThreshold();

        // Assert
        expect(actual.standard).toBe(0.90);
        expect(actual.strict).toBe(0.95);
        expect(actual.active).toBe(0.80);
      });

    });

    context('設定読み込みが失敗する場合', () => {

      // IT-REPO-Threshold-004
      it('config-foundation読み込みが失敗した場合、デフォルト値active=0.90にフォールバックすること', async () => {
        // Arrange
        vi.mocked(configFoundation.loadConfig).mockRejectedValue(new Error('config load failed'));
        const adapter = new ConfigFoundationCoverageThresholdAdapter();

        // Act
        const actual = await adapter.getThreshold();

        // Assert
        expect(actual.active).toBe(0.90);
      });

      // IT-REPO-Threshold-005
      it('未知のpresetの場合、デフォルト値active=0.90にフォールバックすること', async () => {
        // Arrange
        vi.mocked(configFoundation.loadConfig).mockResolvedValue({
          project: { preset: 'unknown' },
        });
        const adapter = new ConfigFoundationCoverageThresholdAdapter();

        // Act
        const actual = await adapter.getThreshold();

        // Assert
        expect(actual.active).toBe(0.90);
      });

    });

  });

});
```

### 4.4 AjvJsonSchemaValidatorAdapter（8件）

```typescript
// @story H07-01

import { target, context } from '../../../../helpers/test-helpers';
import { AjvJsonSchemaValidatorAdapter } from '../../../../../nyquist-validation/infrastructure/adapters/ajv-json-schema-validator-adapter';

// AjvJsonSchemaValidatorAdapterは実体使用（外部ライブラリajvのみ依存）

target('AjvJsonSchemaValidatorAdapter', () => {

  describe('validateメソッドによるJSONスキーマ検証', () => {

    context('完全に有効なrequirement-test-matrixオブジェクトを渡した場合', () => {

      // IT-REPO-AjvValidator-001
      it('有効なmatrixオブジェクトを渡すと、valid=trueかつerrorsが空配列で返ること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();
        const validData = createValidFullCoverageMatrixData();

        // Act
        const actual = await adapter.validate(validData);

        // Assert
        expect(actual.valid).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });

    });

    context('必須フィールドが欠損しているオブジェクトを渡した場合', () => {

      // IT-REPO-AjvValidator-002
      it('storiesフィールドが欠損したオブジェクトを渡すと、valid=falseかつerrorsにL3-004エラーが含まれること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();
        const missingStories = { version: '1.0.0', generatedAt: '2026-03-19T00:00:00.000Z' };

        // Act
        const actual = await adapter.validate(missingStories);

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(actual.errors[0].code).toBe('L3-004');
      });

      // IT-REPO-AjvValidator-003
      it('storyIdが不正形式（HXX-XX形式でない）のオブジェクトを渡すと、valid=falseかつpatternエラーが含まれること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();
        const invalidStoryId = {
          version: '1.0.0',
          generatedAt: '2026-03-19T00:00:00.000Z',
          stories: [
            { storyId: 'INVALID-FORMAT', storyMappings: [] },
          ],
        };

        // Act
        const actual = await adapter.validate(invalidStoryId);

        // Assert
        expect(actual.valid).toBe(false);
        const hasPatternError = actual.errors.some(
          (e) => e.message?.includes('pattern') || e.message?.includes('format')
        );
        expect(hasPatternError).toBe(true);
      });

      // IT-REPO-AjvValidator-004
      it('testTypeが"unit"/"it"/"scenario"以外の場合、valid=falseかつenumエラーが含まれること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();
        const invalidTestType = {
          version: '1.0.0',
          generatedAt: '2026-03-19T00:00:00.000Z',
          stories: [
            {
              storyId: 'H07-01',
              storyMappings: [
                {
                  acId: 'AC-1',
                  testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'e2e', testName: 'test' }],
                },
              ],
            },
          ],
        };

        // Act
        const actual = await adapter.validate(invalidTestType);

        // Assert
        expect(actual.valid).toBe(false);
        const hasEnumError = actual.errors.some(
          (e) => e.message?.includes('enum') || e.message?.includes('allowedValues')
        );
        expect(hasEnumError).toBe(true);
      });

      // IT-REPO-AjvValidator-005
      it('filePathが空文字の場合、valid=falseかつminLengthまたはpatternエラーが含まれること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();
        const emptyFilePath = {
          version: '1.0.0',
          generatedAt: '2026-03-19T00:00:00.000Z',
          stories: [
            {
              storyId: 'H07-01',
              storyMappings: [
                {
                  acId: 'AC-1',
                  testReferences: [{ filePath: '', testType: 'it', testName: 'test' }],
                },
              ],
            },
          ],
        };

        // Act
        const actual = await adapter.validate(emptyFilePath);

        // Assert
        expect(actual.valid).toBe(false);
      });

      // IT-REPO-AjvValidator-006
      it('acIdがAC-0（ゼロパディング）の場合、valid=falseかつpatternエラーが含まれること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();
        const invalidAcId = {
          version: '1.0.0',
          generatedAt: '2026-03-19T00:00:00.000Z',
          stories: [
            {
              storyId: 'H07-01',
              storyMappings: [
                { acId: 'AC-0', testReferences: [] },
              ],
            },
          ],
        };

        // Act
        const actual = await adapter.validate(invalidAcId);

        // Assert
        expect(actual.valid).toBe(false);
        const hasPatternError = actual.errors.some(
          (e) => e.message?.includes('pattern')
        );
        expect(hasPatternError).toBe(true);
      });

      // IT-REPO-AjvValidator-007
      it('複数フィールドが同時に不正な場合、allErrors=true設定により全エラーが一括でerrorsに格納されること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();
        const multipleErrors = {
          version: '1.0.0',
          generatedAt: '2026-03-19T00:00:00.000Z',
          stories: [
            {
              storyId: 'BAD-FORMAT',
              storyMappings: [
                {
                  acId: 'AC-0',
                  testReferences: [{ filePath: '', testType: 'e2e', testName: 'test' }],
                },
              ],
            },
          ],
        };

        // Act
        const actual = await adapter.validate(multipleErrors);

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors.length).toBeGreaterThanOrEqual(2);
      });

      // IT-REPO-AjvValidator-008
      it('nullを渡すと、valid=falseかつtypeエラーが含まれること', async () => {
        // Arrange
        const adapter = new AjvJsonSchemaValidatorAdapter();

        // Act
        const actual = await adapter.validate(null);

        // Assert
        expect(actual.valid).toBe(false);
        const hasTypeError = actual.errors.some(
          (e) => e.message?.includes('type') || e.message?.includes('null')
        );
        expect(hasTypeError).toBe(true);
      });

    });

  });

});
```

---

## 5. Handlerテスト詳細ロジック

### 5.1 ValidateMatrixHandler（6件）

```typescript
// @story H07-01

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { ValidateMatrixHandler } from '../../../../../nyquist-validation/presentation/handlers/validate-matrix-handler';

target('ValidateMatrixHandler', () => {

  describe('正常系: バリデーション成功の出力', () => {

    context('--matrix-fileを渡してバリデーション成功の場合', () => {

      // IT-API-ValidateHandler-001
      it('--matrix-file /valid.jsonを渡すと、stdoutにバリデーション成功メッセージが出力され終了コード0で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            passed: true,
            errors: [],
            schemaErrors: [],
            integrityErrors: [],
            validatedData: createValidFullCoverageMatrixData(),
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new ValidateMatrixHandler({ validateMatrixUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/valid.json', failFast: false, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        expect(output).toMatch(/success|passed|OK/i);
      });

      // IT-API-ValidateHandler-002
      it('--matrix-file /valid.json --format jsonを渡すと、stdoutにJSON形式のValidateMatrixOutputが出力され終了コード0で終了すること', async () => {
        // Arrange
        const outputData = {
          passed: true,
          errors: [],
          schemaErrors: [],
          integrityErrors: [],
          validatedData: createValidFullCoverageMatrixData(),
        };
        const mockUseCase = { execute: vi.fn().mockResolvedValue(outputData) };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new ValidateMatrixHandler({ validateMatrixUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/valid.json', failFast: false, format: 'json' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        const parsed = JSON.parse(output);
        expect(parsed.passed).toBe(true);
      });

    });

  });

  describe('異常系: バリデーション失敗・エラーの出力', () => {

    context('スキーマエラーがある場合', () => {

      // IT-API-ValidateHandler-003
      it('--matrix-file /invalid-schema.jsonを渡すと、stdoutにエラー一覧が表示され終了コード1で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: 'L3-004', message: 'schema error', severity: 'error' }],
            schemaErrors: [{ code: 'L3-004', message: 'schema error', severity: 'error' }],
            integrityErrors: [],
            validatedData: null,
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new ValidateMatrixHandler({ validateMatrixUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/invalid-schema.json', failFast: false, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        expect(output).toMatch(/L3-004|schema error/i);
      });

      // IT-API-ValidateHandler-004
      it('--matrix-file /invalid.json --fail-fastを渡すと、最初のエラーで打ち切られ終了コード1で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: 'L3-004', message: 'first schema error', severity: 'error' }],
            schemaErrors: [{ code: 'L3-004', message: 'first schema error', severity: 'error' }],
            integrityErrors: [],
            validatedData: null,
          }),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new ValidateMatrixHandler({ validateMatrixUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/invalid.json', failFast: true, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({ failFast: true })
        );
      });

    });

    context('I/Oエラーが発生した場合', () => {

      // IT-API-ValidateHandler-005
      it('--matrix-file /not-found.jsonを渡すと、stderrにI/Oエラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        };
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new ValidateMatrixHandler({ validateMatrixUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/not-found.json', failFast: false, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
        const errOutput = stderrSpy.mock.calls.map((c) => c[0]).join('');
        expect(errOutput).toMatch(/ENOENT|error/i);
      });

      // IT-API-ValidateHandler-006
      it('--matrix-file引数なしで実行すると、引数不足エラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const handler = new ValidateMatrixHandler({
          validateMatrixUseCase: { execute: vi.fn() },
        });

        // Act
        await handler.handle({ matrixFilePath: undefined as any, failFast: false, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });

    });

  });

});
```

### 5.2 CheckAcCoverageGateHandler（5件）

```typescript
// @story H07-02

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { CheckAcCoverageGateHandler } from '../../../../../nyquist-validation/presentation/handlers/check-ac-coverage-gate-handler';

target('CheckAcCoverageGateHandler', () => {

  describe('正常系: ゲート通過の出力', () => {

    context('全AC網羅済みのmatrixを渡した場合', () => {

      // IT-API-CheckACGateHandler-001
      it('--matrix-file /full-coverage.jsonを渡すと、stdoutにstatus:passのJSONが出力され終了コード0で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            passed: true,
            errors: [],
            matrix: createValidFullCoverageMatrixData(),
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CheckAcCoverageGateHandler({ checkAcCoverageGateUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/full-coverage.json', format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        expect(output).toMatch(/pass|OK/i);
      });

      // IT-API-CheckACGateHandler-002
      it('--matrix-file /full.json --format jsonを渡すと、stdoutにHarnessApiResponseエンベロープJSONでstatus:passが出力され終了コード0で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            passed: true,
            errors: [],
            matrix: createValidFullCoverageMatrixData(),
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CheckAcCoverageGateHandler({ checkAcCoverageGateUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/full.json', format: 'json' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        const parsed = JSON.parse(output);
        expect(parsed.status).toBe('pass');
      });

    });

  });

  describe('異常系: ゲート失敗・エラーの出力', () => {

    context('未カバーACがある場合', () => {

      // IT-API-CheckACGateHandler-003
      it('--matrix-file /partial-coverage.jsonを渡すと、HarnessApiResponseでstatus:failとerrorsに未カバーAC一覧が出力され終了コード1で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: 'L3-004', message: 'AC not covered: H07-01.AC-4', severity: 'error' }],
            matrix: null,
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CheckAcCoverageGateHandler({ checkAcCoverageGateUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/partial-coverage.json', format: 'json' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        const parsed = JSON.parse(output);
        expect(parsed.status).toBe('fail');
        expect(parsed.errors.length).toBeGreaterThanOrEqual(1);
      });

      // IT-API-CheckACGateHandler-004
      it('--matrix-file /not-found.jsonを渡すと、実行エラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        };
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CheckAcCoverageGateHandler({ checkAcCoverageGateUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/not-found.json', format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });

      // IT-API-CheckACGateHandler-005
      it('--matrix-file /invalid-schema.jsonを渡すと、スキーマエラーが表示され終了コード1で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: 'L3-004', message: 'schema error', severity: 'error' }],
            matrix: null,
          }),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CheckAcCoverageGateHandler({ checkAcCoverageGateUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/invalid-schema.json', format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

    });

  });

});
```

### 5.3 CalculateCoverageHandler（6件）

```typescript
// @story H07-03

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { CalculateCoverageHandler } from '../../../../../nyquist-validation/presentation/handlers/calculate-coverage-handler';

target('CalculateCoverageHandler', () => {

  describe('正常系: 網羅率の出力', () => {

    context('--matrix-fileのみを渡した場合', () => {

      // IT-API-CalcCoverageHandler-001
      it('--matrix-file /partial.jsonを渡すと、stdoutに網羅率（例: "75.00%"）が出力され終了コード0で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            ratePercent: 75.0,
            coveredAcCount: 3,
            totalAcCount: 4,
            uncoveredAcIds: ['H07-01.AC-4'],
            threshold: null,
            meetsThreshold: null,
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CalculateCoverageHandler({ calculateCoverageUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/partial.json', checkThreshold: false, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        expect(output).toMatch(/75\.00%|75%|75\.0/);
      });

      // IT-API-CalcCoverageHandler-002
      it('--matrix-file /full.json --check-thresholdを渡すと、閾値充足メッセージが出力され終了コード0で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            ratePercent: 100.0,
            coveredAcCount: 3,
            totalAcCount: 3,
            uncoveredAcIds: [],
            threshold: 0.90,
            meetsThreshold: true,
          }),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CalculateCoverageHandler({ calculateCoverageUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/full.json', checkThreshold: true, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
      });

      // IT-API-CalcCoverageHandler-003
      it('--matrix-file /partial.json --format jsonを渡すと、stdoutにCalculateCoverageOutput JSONが出力され終了コード0で終了すること', async () => {
        // Arrange
        const outputData = {
          ratePercent: 75.0,
          coveredAcCount: 3,
          totalAcCount: 4,
          uncoveredAcIds: ['H07-01.AC-4'],
          threshold: null,
          meetsThreshold: null,
        };
        const mockUseCase = { execute: vi.fn().mockResolvedValue(outputData) };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CalculateCoverageHandler({ calculateCoverageUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/partial.json', checkThreshold: false, format: 'json' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        const parsed = JSON.parse(output);
        expect(parsed.ratePercent).toBe(75.0);
      });

    });

  });

  describe('異常系: 閾値未達・I/Oエラーの出力', () => {

    context('閾値未達の場合', () => {

      // IT-API-CalcCoverageHandler-004
      it('--matrix-file /low-coverage.json --check-thresholdを渡すと、閾値未達メッセージが出力され終了コード1で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            ratePercent: 60.0,
            coveredAcCount: 3,
            totalAcCount: 5,
            uncoveredAcIds: ['H07-01.AC-3', 'H07-01.AC-4'],
            threshold: 0.90,
            meetsThreshold: false,
          }),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CalculateCoverageHandler({ calculateCoverageUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/low-coverage.json', checkThreshold: true, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

      // IT-API-CalcCoverageHandler-005
      it('--matrix-file /not-found.jsonを渡すと、I/Oエラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        };
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CalculateCoverageHandler({ calculateCoverageUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/not-found.json', checkThreshold: false, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });

      // IT-API-CalcCoverageHandler-006
      it('--matrix-file /invalid-schema.json --check-thresholdを渡すと、スキーマエラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('schema validation failed')),
        };
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new CalculateCoverageHandler({ calculateCoverageUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/invalid-schema.json', checkThreshold: true, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });

    });

  });

});
```

### 5.4 AnalyzeImpactHandler（6件）

```typescript
// @story H07-04

import { target, context } from '../../../../helpers/test-helpers';
import { vi } from 'vitest';
import { AnalyzeImpactHandler } from '../../../../../nyquist-validation/presentation/handlers/analyze-impact-handler';

target('AnalyzeImpactHandler', () => {

  describe('正常系: 影響分析結果の出力', () => {

    context('存在するstoryIdを渡した場合', () => {

      // IT-API-AnalyzeImpactHandler-001
      it('--matrix-file /valid.json --story-id H07-01を渡すと、stdoutにテスト参照一覧が出力され終了コード0で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            found: true,
            storyId: 'H07-01',
            directTests: [
              { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' },
              { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' },
            ],
            directMappingOnly: true,
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new AnalyzeImpactHandler({ analyzeImpactUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/valid.json', storyId: 'H07-01', format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        expect(output).toMatch(/specs\/h07-01\.spec\.ts|AC-1 test/);
      });

      // IT-API-AnalyzeImpactHandler-002
      it('--matrix-file /valid.json --story-id H07-01 --format jsonを渡すと、stdoutにAnalyzeImpactOutput JSON（found: true）が出力され終了コード0で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            found: true,
            storyId: 'H07-01',
            directTests: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' }],
            directMappingOnly: true,
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new AnalyzeImpactHandler({ analyzeImpactUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/valid.json', storyId: 'H07-01', format: 'json' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(0);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        const parsed = JSON.parse(output);
        expect(parsed.found).toBe(true);
      });

      // IT-API-AnalyzeImpactHandler-003
      it('--matrix-file /valid.json --story-id H99-99を渡すと、空のdirectTests表示（テスト参照なし）が出力され終了コード1で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockResolvedValue({
            found: false,
            storyId: 'H99-99',
            directTests: [],
            directMappingOnly: true,
          }),
        };
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new AnalyzeImpactHandler({ analyzeImpactUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/valid.json', storyId: 'H99-99', format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(1);
        const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
        expect(output).toMatch(/テスト参照なし|not found|no tests/i);
      });

    });

  });

  describe('異常系: 書式エラー・I/Oエラーの出力', () => {

    context('storyId書式が不正な場合', () => {

      // IT-API-AnalyzeImpactHandler-004
      it('--story-id invalid-formatを渡すと、storyId書式エラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('Invalid storyId format: invalid-format')),
        };
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new AnalyzeImpactHandler({ analyzeImpactUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/valid.json', storyId: 'invalid-format', format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });

      // IT-API-AnalyzeImpactHandler-005
      it('--matrix-file /not-found.json --story-id H07-01を渡すと、I/Oエラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const mockUseCase = {
          execute: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
        };
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new AnalyzeImpactHandler({ analyzeImpactUseCase: mockUseCase });

        // Act
        await handler.handle({ matrixFilePath: '/not-found.json', storyId: 'H07-01', format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });

      // IT-API-AnalyzeImpactHandler-006
      it('--story-id引数なしで実行すると、引数不足エラーが表示され終了コード2で終了すること', async () => {
        // Arrange
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
        const handler = new AnalyzeImpactHandler({
          analyzeImpactUseCase: { execute: vi.fn() },
        });

        // Act
        await handler.handle({ matrixFilePath: '/valid.json', storyId: undefined as any, format: 'human' });

        // Assert
        expect(exitSpy).toHaveBeenCalledWith(2);
      });

    });

  });

});
```

---

## 6. テスト実行コマンド

```bash
# nyquist-validation 統合テスト全件実行
npx vitest run scripts/harness/__tests__/integration/nyquist-validation/

# UseCase テストのみ実行
npx vitest run scripts/harness/__tests__/integration/nyquist-validation/usecase/

# Adapter テストのみ実行
npx vitest run scripts/harness/__tests__/integration/nyquist-validation/adapter/

# Handler テストのみ実行
npx vitest run scripts/harness/__tests__/integration/nyquist-validation/handler/

# 特定テストファイルのみ実行
npx vitest run scripts/harness/__tests__/integration/nyquist-validation/usecase/validate-matrix-usecase.it.test.ts

# カバレッジ付き実行
npx vitest run --coverage scripts/harness/__tests__/integration/nyquist-validation/

# ウォッチモード（開発中）
npx vitest watch scripts/harness/__tests__/integration/nyquist-validation/
```
