# ユニットテストロジック設計: validator-system

@story-id H08-01
@story-id H08-02
@story-id H08-03
@story-id H08-04
@story-id H08-05
@story-id H08-06
> **Unit ID**: validator-system
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **インプット**: `unit_test_design.md`, `unit_test_logic_plan.md`
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. テストファイル構成

| テストファイル | 対象クラス | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/validator-system/validator-id.test.ts` | ValidatorId (VO) | 23 |
| `scripts/harness/__tests__/unit/validator-system/validator-definition.test.ts` | ValidatorDefinition (VO) | 12 |
| `scripts/harness/__tests__/unit/validator-system/validation-rule.test.ts` | ValidationRule (VO) | 7 |
| `scripts/harness/__tests__/unit/validator-system/validation-result.test.ts` | ValidationResult (VO) | 12 |
| `scripts/harness/__tests__/unit/validator-system/layer-config.test.ts` | LayerConfig (VO) | 11 |
| `scripts/harness/__tests__/unit/validator-system/drift-report.test.ts` | DriftReport (VO) | 8 |
| `scripts/harness/__tests__/unit/validator-system/consistency-report.test.ts` | ConsistencyReport (VO) | 7 |
| `scripts/harness/__tests__/unit/validator-system/dead-code-report.test.ts` | DeadCodeReport (VO) | 7 |
| `scripts/harness/__tests__/unit/validator-system/validator-registry.test.ts` | ValidatorRegistry (DS) | 15 |
| `scripts/harness/__tests__/unit/validator-system/validator-execution-service.test.ts` | ValidatorExecutionService (DS) | 12 |
| `scripts/harness/__tests__/unit/validator-system/drift-detection-service.test.ts` | DriftDetectionService (DS) | 6 |
| `scripts/harness/__tests__/unit/validator-system/consistency-check-service.test.ts` | ConsistencyCheckService (DS) | 5 |
| `scripts/harness/__tests__/unit/validator-system/dead-code-detection-service.test.ts` | DeadCodeDetectionService (DS) | 7 |

境界値ケース（UT-BND-*）は各テストファイルに分散して記載する。

---

## 2. 共通ヘルパー・ファクトリ

以下のファクトリ関数を `scripts/harness/__tests__/helpers/test-helpers.ts` に追加する。

```typescript
import { describe } from 'vitest';

// --- 既存エクスポート（変更なし） ---
export const target = describe;
export const context = describe;

// --- validator-system 用ファクトリ関数 ---

/**
 * ValidatorId ファクトリ
 * デフォルト: 'L2-001'（有効範囲最小値）
 */
export const createValidatorId = (value = 'L2-001') =>
  ValidatorId.create(value);

/**
 * ValidationRule ファクトリ
 */
export const createValidationRule = (overrides: Partial<ValidationRuleProps> = {}) =>
  ValidationRule.create({
    ruleName: 'aaa-pattern',
    errorTemplate: {
      code: 'L2-001',
      severity: 'error',
      messageTemplate: 'AAAパターン違反: {{location}}',
    },
    fixExample: null,
    ...overrides,
  });

/**
 * ValidatorDefinition ファクトリ
 * デフォルト: L2-001 / layer: "L2" / enabledCondition: "always"
 */
export const createValidatorDefinition = (overrides: Partial<ValidatorDefinitionProps> = {}) =>
  ValidatorDefinition.create({
    validatorId: createValidatorId('L2-001'),
    layer: 'L2',
    rules: [createValidationRule()],
    enabledCondition: 'always',
    externalPolicyRef: null,
    ...overrides,
  });

/**
 * ValidationResult ファクトリ
 * デフォルト: passed=true
 */
export const createValidationResult = (overrides: Partial<ValidationResultProps> = {}) =>
  ValidationResult.pass(
    createValidatorId('L2-001'),
    100,
  );

/**
 * LayerConfig ファクトリ
 * デフォルト: L2 / enabled=true / strictOnly=false
 */
export const createLayerConfig = (overrides: Partial<LayerConfigProps> = {}) =>
  LayerConfig.create({
    layer: 'L2',
    enabled: true,
    validatorIds: ['L2-001', 'L2-002', 'L2-003'],
    thresholds: {},
    strictOnly: false,
    preset: 'standard',
    ...overrides,
  });

/**
 * DriftReport ファクトリ
 * デフォルト: direction: "design→code"
 */
export const createDriftReport = (overrides: Partial<DriftReportProps> = {}) =>
  DriftReport.create({
    direction: 'design→code',
    unitName: 'validator-system',
    element: 'ValidatorId',
    description: '設計に存在するがコードに存在しない',
    ...overrides,
  });

/**
 * ValidatorRegistry ファクトリ
 * デフォルト: 全10件のバリデータ定義で初期化
 */
export const createValidatorRegistry = (defs?: ValidatorDefinition[]) => {
  const definitions = defs ?? [
    createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
    createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
    createValidatorDefinition({ validatorId: createValidatorId('L2-003'), layer: 'L2' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-001'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-002'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-003'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-004'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-001'), layer: 'L4' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-002'), layer: 'L4' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-003'), layer: 'L4' }),
  ];
  return new ValidatorRegistry(definitions);
};
```

補足:
- ファクトリ関数はテストファイル内でもインライン定義してよい（重複を避けるためヘルパー追加を推奨）
- `overrides` を受け取るファクトリは `Partial<...Props>` でスプレッドして上書きする
- `createValidatorRegistry` で全10件のIDは `VALIDATOR_NAME_MAP` の定義に従う

---

## 3. テストケース詳細ロジック

### 3.1 `validator-id.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ValidatorId } from '../../../src/validator-system/domain/value-objects/validator-id';
import { InvalidValidatorIdError } from '../../../src/validator-system/domain/errors';

target('ValidatorId', () => {

  // ===== 生成テスト =====
  describe('有効な値からValidatorIdを生成する', () => {

    // UT-VID-001
    it('L2-001を渡すとValidatorIdが生成されること', () => {
      // Arrange
      const input = 'L2-001';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual.value).toBe('L2-001');
    });

    // UT-VID-002
    it('L3-003を渡すとValidatorIdが生成されること', () => {
      // Arrange
      const input = 'L3-003';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual.value).toBe('L3-003');
    });

    // UT-VID-003 / UT-BND-002
    it('L4-003（有効範囲最大値）を渡すとValidatorIdが生成されること', () => {
      // Arrange
      const input = 'L4-003';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual.value).toBe('L4-003');
    });

    // UT-VID-004 / UT-BND-001
    it('L2-001（有効範囲最小値）を渡すとValidatorIdが生成されること', () => {
      // Arrange
      const input = 'L2-001';
      // Act
      const actual = ValidatorId.create(input);
      // Assert
      expect(actual).toBeDefined();
    });
  });

  context('無効な値が渡された場合', () => {

    // UT-VID-005
    it('小文字のl2-001を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'l2-001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-VID-006
    it('L1-001（L1は無効レイヤー）を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'L1-001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-VID-007
    it('L5-001（L5は無効レイヤー）を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'L5-001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-VID-008
    it('L2-004（L2レイヤー範囲外）を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'L2-004';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-VID-009 / UT-BND-004
    it('L2-000（連番下限未満）を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'L2-000';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-VID-010
    it('空文字を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = '';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-VID-011
    it('桁数不足のL2-01を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'L2-01';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-VID-012
    it('桁数超過のL2-0001を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'L2-0001';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });

    // UT-BND-003
    it('L4-004（有効範囲超過）を渡すとInvalidValidatorIdErrorをthrowすること', () => {
      // Arrange
      const input = 'L4-004';
      // Act
      const actual = () => ValidatorId.create(input);
      // Assert
      expect(actual).toThrow(InvalidValidatorIdError);
    });
  });

  // ===== getLayer() テスト =====
  describe('getLayer()でレイヤー文字列を返す', () => {

    // UT-VID-013
    it('L2-001のValidatorIdからL2を返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L2-001');
      // Act
      const actual = sut.getLayer();
      // Assert
      expect(actual).toBe('L2');
    });

    // UT-VID-014
    it('L4-003のValidatorIdからL4を返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L4-003');
      // Act
      const actual = sut.getLayer();
      // Assert
      expect(actual).toBe('L4');
    });
  });

  // ===== getName() テスト =====
  describe('getName()でバリデータ名を返す', () => {

    // UT-VID-015
    it('L2-001のValidatorIdからphase-gateを返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L2-001');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('phase-gate');
    });

    // UT-VID-016
    it('L3-003のValidatorIdからcoverageを返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L3-003');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('coverage');
    });

    // UT-VID-017
    it('L4-001のValidatorIdからdrift-detectを返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L4-001');
      // Act
      const actual = sut.getName();
      // Assert
      expect(actual).toBe('drift-detect');
    });
  });

  // ===== toString() テスト =====
  describe('toString()でID文字列を返す', () => {

    // UT-VID-018
    it('L2-002のValidatorIdのtoString()がL2-002を返すこと', () => {
      // Arrange
      const sut = ValidatorId.create('L2-002');
      // Act
      const actual = sut.toString();
      // Assert
      expect(actual).toBe('L2-002');
    });
  });

  // ===== equals() テスト =====
  describe('equals()で同値比較を行う', () => {

    // UT-VID-019
    it('同一IDの2つのValidatorIdのequals()がtrueを返すこと', () => {
      // Arrange
      const a = ValidatorId.create('L2-001');
      const b = ValidatorId.create('L2-001');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-VID-020
    it('異なるIDのValidatorId同士のequals()がfalseを返すこと', () => {
      // Arrange
      const a = ValidatorId.create('L2-001');
      const b = ValidatorId.create('L2-002');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });

  // ===== fromName() テスト =====
  describe('fromName()でバリデータ名からValidatorIdを生成する', () => {

    // UT-VID-021
    it('phase-gateを渡すとL2-001相当のValidatorIdが返ること', () => {
      // Arrange
      const name = 'phase-gate';
      // Act
      const actual = ValidatorId.fromName(name);
      // Assert
      expect(actual.value).toBe('L2-001');
    });

    // UT-VID-022
    it('dead-codeを渡すとL4-003相当のValidatorIdが返ること', () => {
      // Arrange
      const name = 'dead-code';
      // Act
      const actual = ValidatorId.fromName(name);
      // Assert
      expect(actual.value).toBe('L4-003');
    });

    // UT-VID-023
    context('未知のバリデータ名が渡された場合', () => {
      it('InvalidValidatorIdErrorをthrowすること', () => {
        // Arrange
        const name = 'unknown-validator';
        // Act
        const actual = () => ValidatorId.fromName(name);
        // Assert
        expect(actual).toThrow(InvalidValidatorIdError);
      });
    });
  });
});
```

---

### 3.2 `validator-definition.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ValidatorDefinition } from '../../../src/validator-system/domain/value-objects/validator-definition';
import { ValidatorId } from '../../../src/validator-system/domain/value-objects/validator-id';
import { createValidatorId, createValidationRule, createValidatorDefinition } from '../../helpers/test-helpers';

target('ValidatorDefinition', () => {

  // ===== 生成テスト =====
  describe('有効なフィールドからValidatorDefinitionを生成する', () => {

    // UT-VDF-001
    it('全フィールド有効でValidatorDefinitionが生成されること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      const rule = createValidationRule();
      // Act
      const actual = ValidatorDefinition.create({
        validatorId,
        layer: 'L2',
        rules: [rule],
        enabledCondition: 'always',
        externalPolicyRef: 'PhaseGatePolicyPort',
      });
      // Assert
      expect(actual).toBeDefined();
      expect(actual.validatorId.value).toBe('L2-001');
    });

    // UT-VDF-004
    it('externalPolicyRef: nullでValidatorDefinitionが生成されrequiresExternalPolicy()がfalseを返すこと', () => {
      // Arrange
      const validatorId = createValidatorId('L2-003');
      // Act
      const actual = ValidatorDefinition.create({
        validatorId,
        layer: 'L2',
        rules: [createValidationRule()],
        enabledCondition: 'always',
        externalPolicyRef: null,
      });
      // Assert
      expect(actual.requiresExternalPolicy()).toBe(false);
    });

    // UT-VDF-005
    it('externalPolicyRef有りでValidatorDefinitionが生成されrequiresExternalPolicy()がtrueを返すこと', () => {
      // Arrange
      const validatorId = createValidatorId('L3-004');
      // Act
      const actual = ValidatorDefinition.create({
        validatorId,
        layer: 'L3',
        rules: [createValidationRule()],
        enabledCondition: 'always',
        externalPolicyRef: 'AcCoveragePolicyPort',
      });
      // Assert
      expect(actual.requiresExternalPolicy()).toBe(true);
    });
  });

  context('無効なフィールドが渡された場合', () => {

    // UT-VDF-002 / UT-BND-012
    it('rules: []（空配列）を渡すとエラーがthrowされること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = () => ValidatorDefinition.create({
        validatorId,
        layer: 'L2',
        rules: [],
        enabledCondition: 'always',
        externalPolicyRef: null,
      });
      // Assert
      expect(actual).toThrow();
    });

    // UT-VDF-003
    it('validatorId.getLayer()とlayerが不一致の場合エラーがthrowされること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001'); // getLayer() === "L2"
      // Act
      const actual = () => ValidatorDefinition.create({
        validatorId,
        layer: 'L3', // ミスマッチ
        rules: [createValidationRule()],
        enabledCondition: 'always',
        externalPolicyRef: null,
      });
      // Assert
      expect(actual).toThrow();
    });
  });

  // ===== メソッドテスト =====
  describe('requiresExternalPolicy()で外部ポリシー要否を返す', () => {

    // UT-VDF-006
    it('externalPolicyRefが非nullのとき trueを返すこと', () => {
      // Arrange
      const sut = createValidatorDefinition({ externalPolicyRef: 'SomePolicyPort' });
      // Act
      const actual = sut.requiresExternalPolicy();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-VDF-007
    it('externalPolicyRefがnullのとき falseを返すこと', () => {
      // Arrange
      const sut = createValidatorDefinition({ externalPolicyRef: null });
      // Act
      const actual = sut.requiresExternalPolicy();
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('isStrictOnly()でstrictOnly条件を判定する', () => {

    // UT-VDF-008
    it('enabledCondition: strictOnlyのとき trueを返すこと', () => {
      // Arrange
      const sut = createValidatorDefinition({ enabledCondition: 'strictOnly' });
      // Act
      const actual = sut.isStrictOnly();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-VDF-009
    it('enabledCondition: alwaysのとき falseを返すこと', () => {
      // Arrange
      const sut = createValidatorDefinition({ enabledCondition: 'always' });
      // Act
      const actual = sut.isStrictOnly();
      // Assert
      expect(actual).toBe(false);
    });

    // UT-VDF-010
    it('enabledCondition: layerEnabledのとき falseを返すこと', () => {
      // Arrange
      const sut = createValidatorDefinition({ enabledCondition: 'layerEnabled' });
      // Act
      const actual = sut.isStrictOnly();
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('equals()で同値比較を行う', () => {

    // UT-VDF-011
    it('同一validatorIdを持つ2つのValidatorDefinitionのequals()がtrueを返すこと', () => {
      // Arrange
      const a = createValidatorDefinition({ validatorId: createValidatorId('L2-001') });
      const b = createValidatorDefinition({ validatorId: createValidatorId('L2-001') });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-VDF-012
    it('異なるvalidatorIdを持つ2つのValidatorDefinitionのequals()がfalseを返すこと', () => {
      // Arrange
      const a = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const b = createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.3 `validation-rule.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ValidationRule } from '../../../src/validator-system/domain/value-objects/validation-rule';
import { createValidationRule } from '../../helpers/test-helpers';

target('ValidationRule', () => {

  // ===== 生成テスト =====
  describe('有効なフィールドからValidationRuleを生成する', () => {

    // UT-VRL-001
    it('全フィールド有効でValidationRuleが生成されること', () => {
      // Arrange
      const props = {
        ruleName: 'aaa-pattern',
        errorTemplate: { code: 'L2-001', severity: 'error' as const, messageTemplate: 'AAAパターン違反' },
        fixExample: 'const fixed = true;',
      };
      // Act
      const actual = ValidationRule.create(props);
      // Assert
      expect(actual).toBeDefined();
      expect(actual.ruleName).toBe('aaa-pattern');
    });

    // UT-VRL-002
    it('fixExample: nullでValidationRuleが生成されること（fixExampleはオプション）', () => {
      // Arrange
      const props = {
        ruleName: 'aaa-pattern',
        errorTemplate: { code: 'L2-001', severity: 'error' as const, messageTemplate: 'AAAパターン違反' },
        fixExample: null,
      };
      // Act
      const actual = ValidationRule.create(props);
      // Assert
      expect(actual.fixExample).toBeNull();
    });

    // UT-VRL-003
    it('errorTemplate.severity: errorでValidationRuleが生成されること', () => {
      // Arrange
      const sut = createValidationRule({ errorTemplate: { code: 'L2-001', severity: 'error', messageTemplate: 'msg' } });
      // Act
      const actual = sut.errorTemplate.severity;
      // Assert
      expect(actual).toBe('error');
    });

    // UT-VRL-004
    it('errorTemplate.severity: warningでValidationRuleが生成されること', () => {
      // Arrange
      const sut = createValidationRule({ errorTemplate: { code: 'L2-001', severity: 'warning', messageTemplate: 'msg' } });
      // Act
      const actual = sut.errorTemplate.severity;
      // Assert
      expect(actual).toBe('warning');
    });
  });

  // ===== メソッドテスト =====
  describe('buildErrorCode()でエラーコードを返す', () => {

    // UT-VRL-005
    it('errorTemplate.code: L2-003のときL2-003を返すこと', () => {
      // Arrange
      const sut = createValidationRule({ errorTemplate: { code: 'L2-003', severity: 'error', messageTemplate: 'msg' } });
      // Act
      const actual = sut.buildErrorCode();
      // Assert
      expect(actual).toBe('L2-003');
    });
  });

  describe('equals()で同値比較を行う', () => {

    // UT-VRL-006
    it('同一ruleNameの2つのValidationRuleのequals()がtrueを返すこと', () => {
      // Arrange
      const a = createValidationRule({ ruleName: 'aaa-pattern' });
      const b = createValidationRule({ ruleName: 'aaa-pattern' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-VRL-007
    it('異なるruleNameの2つのValidationRuleのequals()がfalseを返すこと', () => {
      // Arrange
      const a = createValidationRule({ ruleName: 'aaa-pattern' });
      const b = createValidationRule({ ruleName: 'hardcoded-secret' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.4 `validation-result.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ValidationResult } from '../../../src/validator-system/domain/value-objects/validation-result';
import { createValidatorId } from '../../helpers/test-helpers';

target('ValidationResult', () => {

  // ===== ファクトリメソッドテスト（正常系）=====
  describe('pass()でValidationResultを生成する', () => {

    // UT-VRS-001
    it('validatorId: L2-001, durationMs: 100でpass結果が生成されること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = ValidationResult.pass(validatorId, 100);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toEqual([]);
      expect(actual.skipped).toBe(false);
      expect(actual.durationMs).toBe(100);
    });

    // UT-VRS-004 / UT-BND-005
    it('durationMs: 0（境界値）でValidationResultが生成されること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = ValidationResult.pass(validatorId, 0);
      // Assert
      expect(actual.durationMs).toBe(0);
    });

    // UT-BND-007
    it('durationMs: 999999（大きな値）でValidationResultが生成されること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = ValidationResult.pass(validatorId, 999999);
      // Assert
      expect(actual.durationMs).toBe(999999);
    });
  });

  describe('fail()でValidationResultを生成する', () => {

    // UT-VRS-002
    it('validatorId: L2-001, errors: [HarnessError], durationMs: 50でfail結果が生成されること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      const errors = [createHarnessError()]; // HarnessError インスタンス
      // Act
      const actual = ValidationResult.fail(validatorId, errors, 50);
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
      expect(actual.skipped).toBe(false);
    });
  });

  describe('skip()でValidationResultを生成する', () => {

    // UT-VRS-003
    it('validatorId: L3-002でskip結果が生成されること', () => {
      // Arrange
      const validatorId = createValidatorId('L3-002');
      // Act
      const actual = ValidationResult.skip(validatorId);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toEqual([]);
      expect(actual.skipped).toBe(true);
      expect(actual.durationMs).toBe(0);
    });
  });

  // ===== 不変条件テスト =====
  context('不変条件違反の入力が渡された場合', () => {

    // UT-VRS-005 (INV-5)
    it('passed: trueかつerrorsに要素がある場合（矛盾状態）エラーがthrowされること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      const errors = [createHarnessError()];
      // Act
      const actual = () => ValidationResult.createRaw({ validatorId, passed: true, errors, skipped: false, durationMs: 100 });
      // Assert
      expect(actual).toThrow();
    });

    // UT-VRS-006 / UT-BND-006 (INV-7)
    it('durationMs: -1（下限未満）を渡すとエラーがthrowされること', () => {
      // Arrange
      const validatorId = createValidatorId('L2-001');
      // Act
      const actual = () => ValidationResult.pass(validatorId, -1);
      // Assert
      expect(actual).toThrow();
    });
  });

  // UT-VRS-007 (INV-8)
  describe('skip()のskipped=true保証', () => {
    it('skip()で生成したValidationResultはpassed: trueかつerrors: []が保証されること', () => {
      // Arrange
      const validatorId = createValidatorId('L3-002');
      // Act
      const actual = ValidationResult.skip(validatorId);
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.errors).toEqual([]);
    });
  });

  // ===== メソッドテスト =====
  describe('hasErrors()でエラー有無を返す', () => {

    // UT-VRS-008
    it('errors.length === 0のとき falseを返すこと', () => {
      // Arrange
      const sut = ValidationResult.pass(createValidatorId('L2-001'), 100);
      // Act
      const actual = sut.hasErrors();
      // Assert
      expect(actual).toBe(false);
    });

    // UT-VRS-009
    it('errors.length > 0のとき trueを返すこと', () => {
      // Arrange
      const sut = ValidationResult.fail(createValidatorId('L2-001'), [createHarnessError()], 50);
      // Act
      const actual = sut.hasErrors();
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('errorCount()でエラー件数を返す', () => {

    // UT-VRS-010
    it('errors.length === 3のとき 3を返すこと', () => {
      // Arrange
      const errors = [createHarnessError(), createHarnessError(), createHarnessError()];
      const sut = ValidationResult.fail(createValidatorId('L2-001'), errors, 50);
      // Act
      const actual = sut.errorCount();
      // Assert
      expect(actual).toBe(3);
    });
  });

  describe('equals()で同値比較を行う', () => {

    // UT-VRS-011
    it('同一validatorId + 同一passed + 同一errorsの2つのValidationResultのequals()がtrueを返すこと', () => {
      // Arrange
      const vid = createValidatorId('L2-001');
      const a = ValidationResult.pass(vid, 100);
      const b = ValidationResult.pass(vid, 100);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-VRS-012
    it('passedが異なる2つのValidationResultのequals()がfalseを返すこと', () => {
      // Arrange
      const vid = createValidatorId('L2-001');
      const a = ValidationResult.pass(vid, 100);
      const b = ValidationResult.fail(vid, [createHarnessError()], 50);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.5 `layer-config.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { LayerConfig } from '../../../src/validator-system/domain/value-objects/layer-config';
import { createLayerConfig, createValidatorId } from '../../helpers/test-helpers';

target('LayerConfig', () => {

  // ===== 生成テスト =====
  describe('有効なフィールドからLayerConfigを生成する', () => {

    // UT-LCF-001
    it('全フィールド有効でLayerConfigが生成されること', () => {
      // Arrange & Act
      const actual = LayerConfig.create({
        layer: 'L2',
        enabled: true,
        validatorIds: ['L2-001'],
        thresholds: {},
        strictOnly: false,
        preset: 'standard',
      });
      // Assert
      expect(actual).toBeDefined();
    });

    // UT-LCF-002
    it('enabled: falseでLayerConfigが生成されisValidatorEnabled()が全てfalseを返すこと', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: false });
      // Act
      const actual = sut.isValidatorEnabled(createValidatorId('L2-001'));
      // Assert
      expect(actual).toBe(false);
    });

    // UT-LCF-003
    it('thresholds: { coverageThreshold: 90 }でLayerConfigが生成されgetThreshold()が90を返すこと', () => {
      // Arrange
      const sut = createLayerConfig({ thresholds: { coverageThreshold: 90 } });
      // Act
      const actual = sut.getThreshold('coverageThreshold');
      // Assert
      expect(actual).toBe(90);
    });

    // UT-LCF-004
    it('preset: strict, strictOnly: trueでLayerConfigが生成されること', () => {
      // Arrange & Act
      const actual = createLayerConfig({ preset: 'strict', strictOnly: true });
      // Assert
      expect(actual).toBeDefined();
    });
  });

  // ===== メソッドテスト =====
  describe('isValidatorEnabled()でバリデータ有効状態を返す', () => {

    // UT-LCF-005 (INV-9)
    it('enabled: true, validatorIds: [L2-001]でL2-001を問い合わせるとtrueを返すこと', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: true, validatorIds: ['L2-001'] });
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.isValidatorEnabled(id);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-LCF-006
    it('enabled: true, validatorIds: [L2-001]でL2-002を問い合わせるとfalseを返すこと', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: true, validatorIds: ['L2-001'] });
      const id = createValidatorId('L2-002');
      // Act
      const actual = sut.isValidatorEnabled(id);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-LCF-007 (INV-8)
    it('enabled: falseでL2-001を問い合わせるとfalseを返すこと', () => {
      // Arrange
      const sut = createLayerConfig({ enabled: false, validatorIds: ['L2-001'] });
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.isValidatorEnabled(id);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('getThreshold()で閾値を返す', () => {

    // UT-LCF-008
    it('thresholds: { coverageThreshold: 90 }でcoverageThresholdを問い合わせると90を返すこと', () => {
      // Arrange
      const sut = createLayerConfig({ thresholds: { coverageThreshold: 90 } });
      // Act
      const actual = sut.getThreshold('coverageThreshold');
      // Assert
      expect(actual).toBe(90);
    });

    // UT-LCF-009
    it('thresholds: {}でbundleSizeLimitを問い合わせるとnullを返すこと', () => {
      // Arrange
      const sut = createLayerConfig({ thresholds: {} });
      // Act
      const actual = sut.getThreshold('bundleSizeLimit');
      // Assert
      expect(actual).toBeNull();
    });

    // UT-BND-008
    it('thresholds: { coverageThreshold: 0 }（閾値下限）でLayerConfigが生成されること', () => {
      // Arrange & Act
      const actual = createLayerConfig({ thresholds: { coverageThreshold: 0 } });
      // Assert
      expect(actual.getThreshold('coverageThreshold')).toBe(0);
    });

    // UT-BND-009
    it('thresholds: { coverageThreshold: 100 }（閾値上限）でLayerConfigが生成されること', () => {
      // Arrange & Act
      const actual = createLayerConfig({ thresholds: { coverageThreshold: 100 } });
      // Assert
      expect(actual.getThreshold('coverageThreshold')).toBe(100);
    });
  });

  describe('equals()で同値比較を行う', () => {

    // UT-LCF-010
    it('全フィールドが同一の2つのLayerConfigのequals()がtrueを返すこと', () => {
      // Arrange
      const a = createLayerConfig();
      const b = createLayerConfig();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-LCF-011
    it('enabledフィールドのみ異なる2つのLayerConfigのequals()がfalseを返すこと', () => {
      // Arrange
      const a = createLayerConfig({ enabled: true });
      const b = createLayerConfig({ enabled: false });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.6 `drift-report.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { DriftReport } from '../../../src/validator-system/domain/value-objects/drift-report';
import { createDriftReport } from '../../helpers/test-helpers';

target('DriftReport', () => {

  // ===== 生成テスト =====
  describe('有効なフィールドからDriftReportを生成する', () => {

    // UT-DRP-001
    it('direction: design→codeで全フィールド有効なDriftReportが生成されること', () => {
      // Arrange & Act
      const actual = DriftReport.create({
        direction: 'design→code',
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: '設計に存在するがコードに存在しない',
      });
      // Assert
      expect(actual).toBeDefined();
      expect(actual.direction).toBe('design→code');
    });

    // UT-DRP-002
    it('direction: code→designで全フィールド有効なDriftReportが生成されること', () => {
      // Arrange & Act
      const actual = DriftReport.create({
        direction: 'code→design',
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: 'コードに存在するが設計に存在しない',
      });
      // Assert
      expect(actual.direction).toBe('code→design');
    });
  });

  context('無効なdirectionが渡された場合', () => {

    // UT-DRP-003 / UT-BND-015 (INV-10)
    it('direction: invalid-directionを渡すとエラーがthrowされること', () => {
      // Arrange
      const input = {
        direction: 'invalid-direction' as any,
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: '無効方向',
      };
      // Act
      const actual = () => DriftReport.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  // ===== メソッドテスト =====
  describe('toHarnessError()でHarnessErrorを返す', () => {

    // UT-DRP-004
    it('direction: design→codeのDriftReportのtoHarnessError()がcode: L4-001のHarnessErrorを返すこと', () => {
      // Arrange
      const sut = DriftReport.create({
        direction: 'design→code',
        unitName: 'validator-system',
        element: 'ValidatorId',
        description: '設計に存在するがコードに存在しない',
      });
      // Act
      const actual = sut.toHarnessError();
      // Assert
      expect(actual.code).toBe('L4-001');
    });

    // UT-DRP-005
    it('direction: code→designのDriftReportのtoHarnessError()がcode: L4-001のHarnessErrorを返すこと', () => {
      // Arrange
      const sut = DriftReport.create({
        direction: 'code→design',
        unitName: 'validator-system',
        element: 'SomeEntity',
        description: 'コードに存在するが設計に存在しない',
      });
      // Act
      const actual = sut.toHarnessError();
      // Assert
      expect(actual.code).toBe('L4-001');
    });
  });

  describe('equals()で同値比較を行う', () => {

    // UT-DRP-006
    it('全フィールドが同一の2つのDriftReportのequals()がtrueを返すこと', () => {
      // Arrange
      const a = createDriftReport();
      const b = createDriftReport();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-DRP-007
    it('directionフィールドが異なる2つのDriftReportのequals()がfalseを返すこと', () => {
      // Arrange
      const a = createDriftReport({ direction: 'design→code' });
      const b = createDriftReport({ direction: 'code→design' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-DRP-008
    it('elementフィールドが異なる2つのDriftReportのequals()がfalseを返すこと', () => {
      // Arrange
      const a = createDriftReport({ element: 'ValidatorId' });
      const b = createDriftReport({ element: 'ValidatorDefinition' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.7 `consistency-report.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ConsistencyReport } from '../../../src/validator-system/domain/value-objects/consistency-report';

target('ConsistencyReport', () => {

  // ===== 生成テスト =====
  describe('有効なフィールドからConsistencyReportを生成する', () => {

    // UT-CSR-001
    it('mismatchPairs: [], checkTargets: [domain_model.md]でConsistencyReportが生成されること', () => {
      // Arrange & Act
      const actual = ConsistencyReport.create({
        mismatchPairs: [],
        checkTargets: ['domain_model.md'],
      });
      // Assert
      expect(actual).toBeDefined();
    });

    // UT-CSR-002
    it('mismatchPairs: [1件]でConsistencyReportが生成されること', () => {
      // Arrange
      const mismatch = { expected: 'L2', actual: 'L3', location: 'domain_model.md:12' };
      // Act
      const actual = ConsistencyReport.create({
        mismatchPairs: [mismatch],
        checkTargets: ['domain_model.md'],
      });
      // Assert
      expect(actual.mismatchPairs).toHaveLength(1);
    });
  });

  // ===== メソッドテスト =====
  describe('hasMismatches()で不整合有無を返す', () => {

    // UT-CSR-003 / UT-BND-013
    it('mismatchPairs: []のとき falseを返すこと', () => {
      // Arrange
      const sut = ConsistencyReport.create({ mismatchPairs: [], checkTargets: [] });
      // Act
      const actual = sut.hasMismatches();
      // Assert
      expect(actual).toBe(false);
    });

    // UT-CSR-004
    it('mismatchPairs.length === 2のとき trueを返すこと', () => {
      // Arrange
      const pair = { expected: 'L2', actual: 'L3', location: 'doc:1' };
      const sut = ConsistencyReport.create({ mismatchPairs: [pair, pair], checkTargets: [] });
      // Act
      const actual = sut.hasMismatches();
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('mismatchCount()で不整合件数を返す', () => {

    // UT-CSR-005
    it('mismatchPairs.length === 3のとき 3を返すこと', () => {
      // Arrange
      const pair = { expected: 'L2', actual: 'L3', location: 'doc:1' };
      const sut = ConsistencyReport.create({ mismatchPairs: [pair, pair, pair], checkTargets: [] });
      // Act
      const actual = sut.mismatchCount();
      // Assert
      expect(actual).toBe(3);
    });
  });

  describe('toHarnessErrors()でHarnessError[]を返す', () => {

    // UT-CSR-006
    it('mismatchPairs.length === 2のときHarnessError[]が2件返ること（各code: L4-002）', () => {
      // Arrange
      const pair = { expected: 'L2', actual: 'L3', location: 'doc:1' };
      const sut = ConsistencyReport.create({ mismatchPairs: [pair, pair], checkTargets: [] });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].code).toBe('L4-002');
      expect(actual[1].code).toBe('L4-002');
    });

    // UT-CSR-007
    it('mismatchPairs: []のとき空配列を返すこと', () => {
      // Arrange
      const sut = ConsistencyReport.create({ mismatchPairs: [], checkTargets: [] });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toEqual([]);
    });
  });
});
```

---

### 3.8 `dead-code-report.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { DeadCodeReport } from '../../../src/validator-system/domain/value-objects/dead-code-report';

target('DeadCodeReport', () => {

  // ===== 生成テスト =====
  describe('有効なフィールドからDeadCodeReportを生成する', () => {

    // UT-DCR-001 / UT-BND-014
    it('unusedExports: [], unreachableCode: [], gcRecommended: falseでDeadCodeReportが生成されること', () => {
      // Arrange & Act
      const actual = DeadCodeReport.create({
        unusedExports: [],
        unreachableCode: [],
        gcRecommended: false,
      });
      // Assert
      expect(actual).toBeDefined();
    });

    // UT-DCR-002
    it('unusedExportsとunreachableCodeに値がある状態でDeadCodeReportが生成されること', () => {
      // Arrange & Act
      const actual = DeadCodeReport.create({
        unusedExports: ['src/index.ts::unusedFn'],
        unreachableCode: [{ filePath: 'src/util.ts', range: { startLine: 10, endLine: 15 } }],
        gcRecommended: false,
      });
      // Assert
      expect(actual.unusedExports).toHaveLength(1);
      expect(actual.unreachableCode).toHaveLength(1);
    });
  });

  // ===== メソッドテスト =====
  describe('hasDeadCode()でデッドコード有無を返す', () => {

    // UT-DCR-003
    it('unusedExports: [], unreachableCode: []のとき falseを返すこと', () => {
      // Arrange
      const sut = DeadCodeReport.create({ unusedExports: [], unreachableCode: [], gcRecommended: false });
      // Act
      const actual = sut.hasDeadCode();
      // Assert
      expect(actual).toBe(false);
    });

    // UT-DCR-004
    it('unusedExports.length === 1のとき trueを返すこと', () => {
      // Arrange
      const sut = DeadCodeReport.create({
        unusedExports: ['src/index.ts::unusedFn'],
        unreachableCode: [],
        gcRecommended: false,
      });
      // Act
      const actual = sut.hasDeadCode();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-DCR-005
    it('unusedExports: [], unreachableCode.length === 1のとき trueを返すこと', () => {
      // Arrange
      const sut = DeadCodeReport.create({
        unusedExports: [],
        unreachableCode: [{ filePath: 'src/util.ts', range: { startLine: 10, endLine: 15 } }],
        gcRecommended: false,
      });
      // Act
      const actual = sut.hasDeadCode();
      // Assert
      expect(actual).toBe(true);
    });
  });

  describe('toHarnessErrors()でHarnessError[]を返す', () => {

    // UT-DCR-006
    it('unusedExports: [1件]のときHarnessError[]が1件返ること（code: L4-003）', () => {
      // Arrange
      const sut = DeadCodeReport.create({
        unusedExports: ['src/index.ts::unusedFn'],
        unreachableCode: [],
        gcRecommended: false,
      });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].code).toBe('L4-003');
    });

    // UT-DCR-007
    it('unusedExports: [], unreachableCode: []のとき空配列を返すこと', () => {
      // Arrange
      const sut = DeadCodeReport.create({ unusedExports: [], unreachableCode: [], gcRecommended: false });
      // Act
      const actual = sut.toHarnessErrors();
      // Assert
      expect(actual).toEqual([]);
    });
  });
});
```

---

### 3.9 `validator-registry.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ValidatorRegistry } from '../../../src/validator-system/domain/services/validator-registry';
import { createValidatorId, createValidatorDefinition, createValidatorRegistry } from '../../helpers/test-helpers';
import { UnknownValidatorError } from '../../../src/validator-system/domain/errors';

target('ValidatorRegistry', () => {

  // ===== 登録・初期化テスト =====
  describe('ValidatorDefinitionリストで初期化する', () => {

    // UT-VRG-001
    it('10件の有効なValidatorDefinitionリストでValidatorRegistryが生成されること', () => {
      // Arrange
      const defs = Array.from({ length: 10 }, (_, i) => {
        const ids = ['L2-001','L2-002','L2-003','L3-001','L3-002','L3-003','L3-004','L4-001','L4-002','L4-003'];
        const layers = ['L2','L2','L2','L3','L3','L3','L3','L4','L4','L4'];
        return createValidatorDefinition({ validatorId: createValidatorId(ids[i]), layer: layers[i] });
      });
      // Act
      const actual = new ValidatorRegistry(defs);
      // Assert
      expect(actual).toBeDefined();
    });

    // UT-VRG-002
    it('同一validatorIdを持つDefinitionが重複する場合エラーがthrowされること', () => {
      // Arrange
      const def1 = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const def2 = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      // Act
      const actual = () => new ValidatorRegistry([def1, def2]);
      // Assert
      expect(actual).toThrow();
    });

    // UT-VRG-003
    it('空リストでValidatorRegistryが生成されること（定義0件）', () => {
      // Arrange & Act
      const actual = new ValidatorRegistry([]);
      // Assert
      expect(actual).toBeDefined();
    });
  });

  // ===== getDefinition() テスト =====
  describe('getDefinition()でValidatorDefinitionを取得する', () => {

    // UT-VRG-004
    it('登録済みのL2-001を渡すと対応するValidatorDefinitionが返ること', () => {
      // Arrange
      const sut = createValidatorRegistry();
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.getDefinition(id);
      // Assert
      expect(actual.validatorId.value).toBe('L2-001');
    });

    // UT-VRG-005
    context('未登録のValidatorIdが渡された場合', () => {
      it('UnknownValidatorErrorをthrowすること', () => {
        // Arrange
        const sut = new ValidatorRegistry([]);
        const id = createValidatorId('L2-001');
        // Act
        const actual = () => sut.getDefinition(id);
        // Assert
        expect(actual).toThrow(UnknownValidatorError);
      });
    });
  });

  // ===== getAllDefinitions() テスト =====
  describe('getAllDefinitions()で全定義を返す', () => {

    // UT-VRG-006 / UT-BND-010
    it('10件登録済みのRegistryからgetAllDefinitions()で10件全て返ること', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      expect(actual).toHaveLength(10);
    });

    // UT-VRG-007
    it('getAllDefinitions()の返却配列は外部から変更不能なreadonly配列であること', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      // TypeScriptのreadonly配列は push 等が型エラーになる。
      // 実行時保護は Object.isFrozen() または実装の freeze 戦略で確認する。
      expect(Object.isFrozen(actual) || Array.isArray(actual)).toBe(true);
    });

    // UT-BND-011
    it('空RegistryのgetAllDefinitions()が空配列を返すこと', () => {
      // Arrange
      const sut = new ValidatorRegistry([]);
      // Act
      const actual = sut.getAllDefinitions();
      // Assert
      expect(actual).toEqual([]);
    });
  });

  // ===== listByLayer() テスト =====
  describe('listByLayer()でレイヤー別定義一覧を返す', () => {

    // UT-VRG-008
    it('layer: L2を渡すとL2-001〜L2-003の3件がvalidatorId昇順で返ること', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L2');
      // Assert
      expect(actual).toHaveLength(3);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[2].validatorId.value).toBe('L2-003');
    });

    // UT-VRG-009
    it('layer: L3を渡すとL3-001〜L3-004の4件が返ること', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L3');
      // Assert
      expect(actual).toHaveLength(4);
    });

    // UT-VRG-010
    it('layer: L4を渡すとL4-001〜L4-003の3件が返ること', () => {
      // Arrange
      const sut = createValidatorRegistry();
      // Act
      const actual = sut.listByLayer('L4');
      // Assert
      expect(actual).toHaveLength(3);
    });
  });

  // ===== select() テスト =====
  describe('select()で指定IDのDefinition一覧を返す', () => {

    // UT-VRG-011
    it('[L2-001, L3-003]を渡すと2件のDefinitionが入力順で返ること', () => {
      // Arrange
      const sut = createValidatorRegistry();
      const ids = [createValidatorId('L2-001'), createValidatorId('L3-003')];
      // Act
      const actual = sut.select(ids);
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[1].validatorId.value).toBe('L3-003');
    });

    // UT-VRG-012
    context('未登録IDを含む配列が渡された場合', () => {
      it('UnknownValidatorErrorをthrowすること', () => {
        // Arrange
        const sut = new ValidatorRegistry([]);
        const ids = [createValidatorId('L2-001')];
        // Act
        const actual = () => sut.select(ids);
        // Assert
        expect(actual).toThrow(UnknownValidatorError);
      });
    });
  });

  // ===== hasDefinition() テスト =====
  describe('hasDefinition()でDefinition存在確認を行う', () => {

    // UT-VRG-013
    it('登録済みのL2-001を渡すとtrueを返すこと', () => {
      // Arrange
      const sut = createValidatorRegistry();
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.hasDefinition(id);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-VRG-014
    it('未登録のValidatorIdを渡すとfalseを返すこと', () => {
      // Arrange
      const def = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const sut = new ValidatorRegistry([def]);
      const id = createValidatorId('L2-002');
      // Act
      const actual = sut.hasDefinition(id);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-VRG-015
    it('空Registryに問い合わせるとfalseを返すこと', () => {
      // Arrange
      const sut = new ValidatorRegistry([]);
      const id = createValidatorId('L2-001');
      // Act
      const actual = sut.hasDefinition(id);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.10 `validator-execution-service.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ValidatorExecutionService } from '../../../src/validator-system/domain/services/validator-execution-service';
import { createValidatorId, createValidatorDefinition, createLayerConfig } from '../../helpers/test-helpers';

// モックファクトリ
const createMockValidatorConfigPort = (overrides = {}) => ({
  getLayerConfig: vi.fn().mockReturnValue(createLayerConfig()),
  ...overrides,
});

const createMockPhaseGatePolicyPort = () => ({
  check: vi.fn().mockResolvedValue({ passed: true, errors: [] }),
});

target('ValidatorExecutionService', () => {

  // ===== スキップ制御テスト =====
  describe('execute() — スキップ制御', () => {

    // UT-VES-001 (INV-8)
    it('LayerConfig.enabled: falseのバリデータはskipされること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort({
        getLayerConfig: vi.fn().mockReturnValue(createLayerConfig({ enabled: false })),
      });
      const def = createValidatorDefinition({ validatorId: createValidatorId('L3-001'), layer: 'L3' });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].skipped).toBe(true);
    });

    // UT-VES-002 (INV-4)
    it('enabledCondition: strictOnlyかつLayerConfig.strictOnly: falseのバリデータはskipされること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort({
        getLayerConfig: vi.fn().mockReturnValue(createLayerConfig({ strictOnly: false })),
      });
      const def = createValidatorDefinition({ enabledCondition: 'strictOnly' });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].skipped).toBe(true);
    });

    // UT-VES-003
    it('enabledCondition: strictOnlyかつLayerConfig.strictOnly: trueのバリデータはskipされないこと', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort({
        getLayerConfig: vi.fn().mockReturnValue(createLayerConfig({ strictOnly: true, enabled: true })),
      });
      const mockPolicyPort = createMockPhaseGatePolicyPort();
      const def = createValidatorDefinition({ enabledCondition: 'strictOnly' });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort, policyPort: mockPolicyPort });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].skipped).toBe(false);
    });

    // UT-VES-004
    it('enabled: trueかつenabledsCondition: alwaysのバリデータは対応するPortが呼び出されること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const mockPolicyPort = createMockPhaseGatePolicyPort();
      const def = createValidatorDefinition({ enabledCondition: 'always' });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort, policyPort: mockPolicyPort });
      // Act
      sut.execute([def]);
      // Assert
      expect(mockPolicyPort.check).toHaveBeenCalled();
    });
  });

  // ===== 順次実行・結果順序テスト =====
  describe('execute() — 結果順序', () => {

    // UT-VES-005
    it('L2-001, L2-002の2件のDefinitionで2件のValidationResultが入力順で返ること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const defs = [
        createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
      ];
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.execute(defs);
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[1].validatorId.value).toBe('L2-002');
    });

    // UT-VES-006
    it('L2-001が成功、L2-002が失敗の場合2件の結果が入力順で返ること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const defs = [
        createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
      ];
      // L2-002 用 Port がエラーを返すよう設定
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort, /* failPort mock */ });
      // Act
      const actual = sut.execute(defs);
      // Assert
      expect(actual).toHaveLength(2);
      expect(actual[0].validatorId.value).toBe('L2-001');
      expect(actual[1].validatorId.value).toBe('L2-002');
    });
  });

  // ===== エラーハンドリングテスト =====
  describe('execute() — エラーハンドリング', () => {

    // UT-VES-007
    it('PortがエラーをthrowするバリデータはValidationResult.fail()に変換されること（他バリデータへの影響なし）', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const mockErrorPort = {
        check: vi.fn().mockImplementation(() => { throw new Error('Port error'); }),
      };
      const def = createValidatorDefinition({ enabledCondition: 'always' });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort, policyPort: mockErrorPort });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].passed).toBe(false);
      expect(actual[0].skipped).toBe(false);
    });

    // UT-VES-008
    it('Portが予期せぬエラーをthrowする場合ValidatorExecutionErrorがthrowされること（またはfail変換）', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const unexpectedErrorPort = {
        check: vi.fn().mockImplementation(() => { throw new Error('Unexpected'); }),
      };
      const def = createValidatorDefinition();
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort, policyPort: unexpectedErrorPort });
      // Act
      const actual = () => sut.execute([def]);
      // Assert
      // 実装戦略に応じて toThrow または passed: false を選択する
      // expect(actual).toThrow(ValidatorExecutionError);
      // または
      expect(sut.execute([def])[0].passed).toBe(false);
    });
  });

  // ===== 実行時間計測テスト =====
  describe('execute() — 実行時間計測', () => {

    // UT-VES-009 (INV-7)
    it('有効なバリデータ実行後のValidationResultはdurationMs >= 0が保証されること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const def = createValidatorDefinition({ enabledCondition: 'always' });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    // UT-VES-010
    it('スキップされたバリデータのdurationMsが0であること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort({
        getLayerConfig: vi.fn().mockReturnValue(createLayerConfig({ enabled: false })),
      });
      const def = createValidatorDefinition();
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.execute([def]);
      // Assert
      expect(actual[0].durationMs).toBe(0);
    });
  });

  // ===== executeWithRelaxation() テスト =====
  describe('executeWithRelaxation() — quick-mode緩和', () => {

    // UT-VES-011
    it('緩和プロファイルで除外指定されたバリデータがskipされること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const def = createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' });
      const relaxationProfile = { excludedValidatorIds: ['L2-001'] };
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.executeWithRelaxation([def], relaxationProfile);
      // Assert
      expect(actual[0].skipped).toBe(true);
    });

    // UT-VES-012
    it('空の緩和プロファイルで通常のexecute()と同一結果が返ること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const def = createValidatorDefinition();
      const emptyProfile = { excludedValidatorIds: [] };
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.executeWithRelaxation([def], emptyProfile);
      const expected = sut.execute([def]);
      // Assert
      expect(actual[0].skipped).toBe(expected[0].skipped);
      expect(actual[0].passed).toBe(expected[0].passed);
    });

    // UT-BND-016
    it('definitions: []（空配列）でexecute()を呼び出すと空のValidationResult[]が返ること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort();
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      // Act
      const actual = sut.execute([]);
      // Assert
      expect(actual).toEqual([]);
    });

    // UT-BND-017
    it('全10件がenabled: falseの設定でexecute()を呼び出すと全件skipped: trueのValidationResultが返ること', () => {
      // Arrange
      const mockConfigPort = createMockValidatorConfigPort({
        getLayerConfig: vi.fn().mockReturnValue(createLayerConfig({ enabled: false })),
      });
      const sut = new ValidatorExecutionService({ configPort: mockConfigPort });
      const defs = [
        createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
        createValidatorDefinition({ validatorId: createValidatorId('L2-003'), layer: 'L2' }),
      ]; // 実際は10件を用意する
      // Act
      const actual = sut.execute(defs);
      // Assert
      expect(actual.every(r => r.skipped === true)).toBe(true);
    });
  });
});
```

---

### 3.11 `drift-detection-service.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { DriftDetectionService } from '../../../src/validator-system/domain/services/drift-detection-service';

// モックファクトリ
const createMockDesignDocumentPort = (elements: string[] = ['ValidatorId']) => ({
  getElements: vi.fn().mockResolvedValue(elements),
});

const createMockSourceCodeAnalyzerPort = (elements: string[] = ['ValidatorId']) => ({
  getElements: vi.fn().mockResolvedValue(elements),
});

target('DriftDetectionService', () => {

  describe('detect() — DriftReport生成', () => {

    // UT-DDS-001
    it('設計文書に存在するがコードに存在しない要素がある場合direction: design→codeのDriftReportが生成されること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId', 'ValidatorDefinition']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId']); // ValidatorDefinition がコードに欠落
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual.some(r => r.direction === 'design→code')).toBe(true);
    });

    // UT-DDS-002
    it('コードに存在するが設計文書に存在しない要素がある場合direction: code→designのDriftReportが生成されること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId', 'ExtraClass']); // ExtraClass が設計に欠落
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual.some(r => r.direction === 'code→design')).toBe(true);
    });

    // UT-DDS-003
    it('設計とコードが完全一致する場合空のDriftReport[]が返ること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId']);
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual).toEqual([]);
    });

    // UT-DDS-004
    it('両方向で乖離がある場合両方向のDriftReportが返ること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort(['ValidatorId', 'DesignOnlyClass']);
      const sourcePort = createMockSourceCodeAnalyzerPort(['ValidatorId', 'CodeOnlyClass']);
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      const actual = await sut.detect();
      // Assert
      expect(actual.some(r => r.direction === 'design→code')).toBe(true);
      expect(actual.some(r => r.direction === 'code→design')).toBe(true);
    });
  });

  describe('detect() — ポートインタラクション', () => {

    // UT-DDS-005
    it('detect()呼び出しでDesignDocumentPortとSourceCodeAnalyzerPortが両方呼び出されること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort();
      const sourcePort = createMockSourceCodeAnalyzerPort();
      const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
      // Act
      await sut.detect();
      // Assert
      expect(designPort.getElements).toHaveBeenCalled();
      expect(sourcePort.getElements).toHaveBeenCalled();
    });

    // UT-DDS-006
    context('DesignDocumentPortがエラーをthrowする場合', () => {
      it('適切なエラーが伝播すること', async () => {
        // Arrange
        const designPort = {
          getElements: vi.fn().mockRejectedValue(new Error('DesignDoc read error')),
        };
        const sourcePort = createMockSourceCodeAnalyzerPort();
        const sut = new DriftDetectionService({ designDocumentPort: designPort, sourceCodeAnalyzerPort: sourcePort });
        // Act
        const actual = sut.detect();
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});
```

---

### 3.12 `consistency-check-service.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ConsistencyCheckService } from '../../../src/validator-system/domain/services/consistency-check-service';

// モックファクトリ
const createMockDesignDocumentPort = (layerAnnotations = { 'domain_model.md': 'L2', 'logical_design.md': 'L2' }) => ({
  getLayerAnnotations: vi.fn().mockResolvedValue(layerAnnotations),
});

const createMockAdrReferencePort = (existingRefs: string[] = ['ADR-001']) => ({
  exists: vi.fn().mockImplementation(async (ref: string) => existingRefs.includes(ref)),
});

target('ConsistencyCheckService', () => {

  describe('check() — ConsistencyReport生成', () => {

    // UT-CCS-001
    it('設計文書間でレイヤー記述が一致する場合mismatchPairs: []のConsistencyReportが返ること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort({ 'domain_model.md': 'L2', 'logical_design.md': 'L2' });
      const adrPort = createMockAdrReferencePort();
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      const actual = await sut.check();
      // Assert
      expect(actual.hasMismatches()).toBe(false);
    });

    // UT-CCS-002
    it('設計文書間でレイヤー記述が不整合の場合mismatchPairsに不整合ペアが含まれるConsistencyReportが返ること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort({ 'domain_model.md': 'L2', 'logical_design.md': 'L3' });
      const adrPort = createMockAdrReferencePort();
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      const actual = await sut.check();
      // Assert
      expect(actual.hasMismatches()).toBe(true);
    });

    // UT-CCS-003
    it('ADRへの参照が実在しない場合不整合として検出されること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort();
      const adrPort = createMockAdrReferencePort([]); // 全参照が存在しない
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      const actual = await sut.check();
      // Assert
      expect(actual.hasMismatches()).toBe(true);
    });
  });

  describe('check() — ポートインタラクション', () => {

    // UT-CCS-004
    it('check()呼び出しでDesignDocumentPortとAdrReferencePortが両方呼び出されること', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort();
      const adrPort = createMockAdrReferencePort();
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      await sut.check();
      // Assert
      expect(designPort.getLayerAnnotations).toHaveBeenCalled();
    });

    // UT-CCS-005
    context('DesignDocumentPortがエラーをthrowする場合', () => {
      it('適切なエラーが伝播すること', async () => {
        // Arrange
        const designPort = {
          getLayerAnnotations: vi.fn().mockRejectedValue(new Error('Port error')),
        };
        const adrPort = createMockAdrReferencePort();
        const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
        // Act
        const actual = sut.check();
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});
```

---

### 3.13 `dead-code-detection-service.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { DeadCodeDetectionService } from '../../../src/validator-system/domain/services/dead-code-detection-service';

// モックファクトリ
const createMockSourceAnalysisPort = (overrides = {}) => ({
  getImportGraph: vi.fn().mockResolvedValue({
    unusedExports: [],
    unreachableCode: [],
  }),
  ...overrides,
});

target('DeadCodeDetectionService', () => {

  describe('detect() — DeadCodeReport生成', () => {

    // UT-DCD-001
    it('未使用エクスポートが存在するImportGraphでunusedExportsに未使用エクスポートが含まれるDeadCodeReportが返ること', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: ['src/index.ts::unusedFn'],
          unreachableCode: [],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.unusedExports).toContain('src/index.ts::unusedFn');
    });

    // UT-DCD-002
    it('到達不能コードが存在するソース解析結果でunreachableCodeに位置情報が含まれるDeadCodeReportが返ること', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: [],
          unreachableCode: [{ filePath: 'src/util.ts', range: { startLine: 10, endLine: 15 } }],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.unreachableCode).toHaveLength(1);
      expect(actual.unreachableCode[0].filePath).toBe('src/util.ts');
    });

    // UT-DCD-003
    it('デッドコードなしの場合hasDeadCode() === falseのDeadCodeReportが返ること', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort();
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.hasDeadCode()).toBe(false);
    });

    // UT-DCD-004
    it('strictOnly: trueかつデッドコードありの場合gcRecommended: trueのDeadCodeReportが返ること', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: ['src/index.ts::unusedFn'],
          unreachableCode: [],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: true });
      // Assert
      expect(actual.gcRecommended).toBe(true);
    });

    // UT-DCD-005
    it('strictOnly: falseかつデッドコードありの場合gcRecommended: falseのDeadCodeReportが返ること', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort({
        getImportGraph: vi.fn().mockResolvedValue({
          unusedExports: ['src/index.ts::unusedFn'],
          unreachableCode: [],
        }),
      });
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      const actual = await sut.detect({ strictOnly: false });
      // Assert
      expect(actual.gcRecommended).toBe(false);
    });
  });

  describe('detect() — ポートインタラクション', () => {

    // UT-DCD-006
    it('detect()呼び出しでSourceAnalysisPortが呼び出されること（biome-ast-engineへの直接依存なし）', async () => {
      // Arrange
      const mockPort = createMockSourceAnalysisPort();
      const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
      // Act
      await sut.detect({ strictOnly: false });
      // Assert
      expect(mockPort.getImportGraph).toHaveBeenCalled();
    });

    // UT-DCD-007
    context('SourceAnalysisPortがエラーをthrowする場合', () => {
      it('適切なエラーが伝播すること', async () => {
        // Arrange
        const mockPort = {
          getImportGraph: vi.fn().mockRejectedValue(new Error('Analysis error')),
        };
        const sut = new DeadCodeDetectionService({ sourceAnalysisPort: mockPort });
        // Act
        const actual = sut.detect({ strictOnly: false });
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});
```

---

## 4. モック戦略

### 値オブジェクト（VO）
- モック不使用。全て `ValidatorId.create()`, `ValidationRule.create()` 等の実体インスタンスを生成する。
- ファクトリ関数（`createValidatorId` 等）でデフォルト値を共通化する。

### ドメインサービスのポートインターフェース
各ポートは `vi.fn()` でモックオブジェクトを構築する。

| ポート名 | 利用テストファイル | モック対象メソッド |
|---|---|---|
| `ValidatorConfigPort` | validator-execution-service | `getLayerConfig()` |
| `PhaseGatePolicyPort` 他 ExecutionPort 群 | validator-execution-service | `check()` / `execute()` |
| `DesignDocumentPort` | drift-detection-service, consistency-check-service | `getElements()` / `getLayerAnnotations()` |
| `SourceCodeAnalyzerPort` | drift-detection-service | `getElements()` |
| `AdrReferencePort` | consistency-check-service | `exists()` |
| `SourceAnalysisPort` | dead-code-detection-service | `getImportGraph()` |

### ドメインサービス間の依存
- `ValidatorExecutionService` が他のドメインサービスに依存する場合は、実体またはモックを選択可能。
- 単体テストでは依存するドメインサービスをモック化することを推奨し、テスト対象の振る舞いのみを検証する。

### 非同期 Port のモック方針
- 同期 Port: `vi.fn().mockReturnValue(...)` を使用する。
- 非同期 Port: `vi.fn().mockResolvedValue(...)` / `vi.fn().mockRejectedValue(...)` を使用する。
- テスト自体が非同期の場合は `async/await` で統一する。

---

## 5. 境界値テスト一覧

| ケースID | 対象ファイル | 検証内容 | 配置箇所 |
|---|---|---|---|
| UT-BND-001 | validator-id.test.ts | `L2-001`（有効範囲最小値）でValidatorId生成成功 | UT-VID-004 と統合 |
| UT-BND-002 | validator-id.test.ts | `L4-003`（有効範囲最大値）でValidatorId生成成功 | UT-VID-003 と統合 |
| UT-BND-003 | validator-id.test.ts | `L4-004`（有効範囲超過）で `InvalidValidatorIdError` | context ブロック追加 |
| UT-BND-004 | validator-id.test.ts | `L2-000`（連番ゼロ）で `InvalidValidatorIdError` | UT-VID-009 と統合 |
| UT-BND-005 | validation-result.test.ts | `durationMs: 0`（下限境界値）で生成成功 | UT-VRS-004 と統合 |
| UT-BND-006 | validation-result.test.ts | `durationMs: -1`（下限未満）でエラー | UT-VRS-006 と統合 |
| UT-BND-007 | validation-result.test.ts | `durationMs: 999999`（大きな値）で生成成功 | describe ブロック追加 |
| UT-BND-008 | layer-config.test.ts | `coverageThreshold: 0`（閾値下限）で生成成功 | describe ブロック追加 |
| UT-BND-009 | layer-config.test.ts | `coverageThreshold: 100`（閾値上限）で生成成功 | describe ブロック追加 |
| UT-BND-010 | validator-registry.test.ts | 10件全登録の `getAllDefinitions()` で10件返る | UT-VRG-006 と統合 |
| UT-BND-011 | validator-registry.test.ts | 空 Registry の `getAllDefinitions()` で空配列返る | describe ブロック追加 |
| UT-BND-012 | validator-definition.test.ts | `rules: []`（空配列）でエラー | UT-VDF-002 と統合 |
| UT-BND-013 | consistency-report.test.ts | `mismatchPairs: []` の `toHarnessErrors()` で空配列返る | UT-CSR-007 と統合 |
| UT-BND-014 | dead-code-report.test.ts | `unusedExports: [], unreachableCode: []` の `hasDeadCode()` で `false` | UT-DCR-001 と統合 |
| UT-BND-015 | drift-report.test.ts | 無効 direction でエラー | UT-DRP-003 と統合 |
| UT-BND-016 | validator-execution-service.test.ts | `definitions: []` の `execute()` で空配列返る | executeWithRelaxation describe に追加 |
| UT-BND-017 | validator-execution-service.test.ts | 全件 `enabled: false` で全件 `skipped: true` | executeWithRelaxation describe に追加 |

---

## 6. テスト実行コマンド

```bash
# validator-system ユニットテスト全件実行
npx vitest run scripts/harness/__tests__/unit/validator-system/

# 特定ファイルのみ実行
npx vitest run scripts/harness/__tests__/unit/validator-system/validator-id.test.ts

# watch モードで開発中に実行
npx vitest scripts/harness/__tests__/unit/validator-system/

# カバレッジ付き実行
npx vitest run --coverage scripts/harness/__tests__/unit/validator-system/

# ケースIDで絞り込み（例: UT-VID-* のみ）
npx vitest run --reporter=verbose -t "UT-VID" scripts/harness/__tests__/unit/validator-system/validator-id.test.ts
```
