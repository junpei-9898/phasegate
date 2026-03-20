# ユニットテストロジック設計: harness-error

## 1. テストファイル構成
| ファイルパス | 対象モデル | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/harness-error/value-objects/error-code.test.ts` | ErrorCode | 12 |
| `scripts/harness/__tests__/harness-error/value-objects/severity.test.ts` | Severity | 8 |
| `scripts/harness/__tests__/harness-error/value-objects/adr-ref.test.ts` | AdrRef | 6 |
| `scripts/harness/__tests__/harness-error/value-objects/fix-example.test.ts` | FixExample | 5 |
| `scripts/harness/__tests__/harness-error/value-objects/fix-example-validation-result.test.ts` | FixExampleValidationResult | 7 |
| `scripts/harness/__tests__/harness-error/value-objects/error-definition.test.ts` | ErrorDefinition | 14 |
| `scripts/harness/__tests__/harness-error/harness-error.test.ts` | HarnessError | 8 |
| `scripts/harness/__tests__/harness-error/services/harness-error-factory.test.ts` | HarnessErrorFactory | 18 |
| `scripts/harness/__tests__/harness-error/services/error-definition-registry.test.ts` | ErrorDefinitionRegistry | 14 |
| `scripts/harness/__tests__/harness-error/services/severity-contract-enforcer.test.ts` | SeverityContractEnforcer | 10 |
| `scripts/harness/__tests__/harness-error/shared-kernel/harness-error-contract.test.ts` | isHarnessError / HarnessErrorContract | 9 |

## 2. 共通ヘルパー・ファクトリ
```ts
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helper/common-helper';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);
const createAdrRef = (value = 'ADR-001') => AdrRef.create(value);
const createFixExample = (value = 'const repaired = true;') => FixExample.create(value);

const createValidationSuccess = (validatorId = 'phase-gate') =>
  FixExampleValidationResult.success(validatorId);

const createValidationFailure = (
  validatorId = 'phase-gate',
  reason = '構文エラー',
  diagnostics = ['Unexpected token']
) => FixExampleValidationResult.failure(validatorId, reason, diagnostics);

const createErrorDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  ErrorDefinition.create({
    code: createErrorCode(),
    title: 'フェーズゲート違反',
    category: 'phase-gate',
    defaultSeverity: createSeverity('warning'),
    adrRefRequired: false,
    defaultAdrRef: null,
    fixExampleRequired: false,
    defaultFixExample: null,
    ownerValidatorId: 'phase-gate',
    ...overrides,
  });

const createAdrRequiredDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  createErrorDefinition({
    adrRefRequired: true,
    defaultAdrRef: createAdrRef('ADR-010'),
    ...overrides,
  });

const createFixExampleRequiredDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  createErrorDefinition({
    fixExampleRequired: true,
    defaultFixExample: createFixExample('const fixedValue = 1;'),
    ...overrides,
  });

const buildHarnessError = (overrides: Partial<HarnessErrorProps> = {}) =>
  new HarnessError({
    code: createErrorCode(),
    severity: createSeverity('warning'),
    message: 'エラー内容',
    suggestion: '修正案',
    adrRef: null,
    fixExample: null,
    ...overrides,
  });

const createRegistry = (definitions: ErrorDefinition[] = []) =>
  new ErrorDefinitionRegistry(definitions);

const createFactory = (params?: {
  definitions?: ErrorDefinition[];
  adrExists?: boolean;
  validationResult?: FixExampleValidationResult;
}) => {
  const registry = createRegistry(
    params?.definitions ?? [createAdrRequiredDefinition(), createFixExampleRequiredDefinition()]
  );
  const severityContractEnforcer = new SeverityContractEnforcer();
  const adrExistenceCheckerPort = {
    exists: vi.fn().mockResolvedValue(params?.adrExists ?? true),
  };
  const fixExampleValidatorPort = {
    validate: vi.fn().mockResolvedValue(params?.validationResult ?? createValidationSuccess()),
  };
  const sut = new HarnessErrorFactory({
    registry,
    severityContractEnforcer,
    adrExistenceCheckerPort,
    fixExampleValidatorPort,
  });

  return { sut, registry, severityContractEnforcer, adrExistenceCheckerPort, fixExampleValidatorPort };
};

const createFactoryParams = (overrides: Partial<CreateHarnessErrorParams> = {}) => ({
  code: 'L1-001',
  requestedSeverity: undefined,
  message: '違反を検出しました',
  suggestion: '設計書を確認してください',
  adrRef: 'ADR-010',
  fixExample: 'const fixedValue = 1;',
  validatorId: 'phase-gate',
  ...overrides,
});

const createContractObject = (overrides: Partial<HarnessErrorContract> = {}) => ({
  code: 'L1-001',
  severity: 'warning',
  message: '違反を検出しました',
  suggestion: '設計書を確認してください',
  adr_ref: 'ADR-010',
  fix_example: 'const fixedValue = 1;',
  ...overrides,
});
```

補足:
- `buildHarnessError` は実装公開APIに合わせて `constructor` / `create` / `reconstitute` のいずれかへ読み替える。
- Portスタブは `Promise.resolve()` で即時解決し、非同期制御そのものは扱わない。
- `result` は使わず、Actの返り値は必ず `actual` に代入する。

## 3. テストケース詳細ロジック

### 3.1 `error-code.test.ts`
```ts
target('ErrorCode', () => {
  target('create', () => {
    describe('有効なエラーコード文字列からErrorCodeを生成する', () => {
      // UT-HE-001
      it('L0-001形式の文字列からErrorCodeが生成されること', () => {
        // Arrange
        const input = 'L0-001';

        // Act
        const actual = ErrorCode.create(input);

        // Assert
        expect(actual.toString()).toBe('L0-001');
        expect(actual.layer).toBe(0);
      });

      // UT-HE-002
      it('L4-999形式の文字列からErrorCodeが生成されること', () => {
        // Arrange
        const input = 'L4-999';

        // Act
        const actual = ErrorCode.create(input);

        // Assert
        expect(actual.toString()).toBe('L4-999');
        expect(actual.layer).toBe(4);
      });

      // UT-HE-003
      it('4桁連番の文字列からErrorCodeが生成されること', () => {
        // Arrange
        const input = 'L0-0001';

        // Act
        const actual = ErrorCode.create(input);

        // Assert
        expect(actual.toString()).toBe('L0-0001');
      });
    });

    context('空文字が渡された場合', () => {
      // UT-HE-008
      it('InvalidErrorCodeErrorをthrowすること', () => {
        // Arrange
        const input = '';

        // Act
        const actual = () => ErrorCode.create(input);

        // Assert
        expect(actual).toThrowError(InvalidErrorCodeError);
      });
    });

    context('L5-001が渡された場合', () => {
      // UT-HE-009
      it('InvalidErrorCodeErrorをthrowすること', () => {
        // Arrange
        const input = 'L5-001';

        // Act
        const actual = () => ErrorCode.create(input);

        // Assert
        expect(actual).toThrowError(InvalidErrorCodeError);
      });
    });

    context('意味名コードが渡された場合', () => {
      // UT-HE-010
      it('InvalidErrorCodeErrorをthrowすること', () => {
        // Arrange
        const input = 'L2-PHASE-GATE';

        // Act
        const actual = () => ErrorCode.create(input);

        // Assert
        expect(actual).toThrowError(InvalidErrorCodeError);
      });
    });

    context('2桁連番が渡された場合', () => {
      // UT-HE-011
      it('InvalidErrorCodeErrorをthrowすること', () => {
        // Arrange
        const input = 'L2-01';

        // Act
        const actual = () => ErrorCode.create(input);

        // Assert
        expect(actual).toThrowError(InvalidErrorCodeError);
      });
    });

    context('正規表現に一致しない文字列が渡された場合', () => {
      // UT-HE-012
      it('InvalidErrorCodeErrorをthrowすること', () => {
        // Arrange
        const input = 'invalid';

        // Act
        const actual = () => ErrorCode.create(input);

        // Assert
        expect(actual).toThrowError(InvalidErrorCodeError);
      });
    });
  });

  target('layer', () => {
    describe('レイヤー識別子を返す', () => {
      // UT-HE-004
      it('layerプロパティがレイヤー識別子を返すこと', () => {
        // Arrange
        const sut = createErrorCode('L3-123');

        // Act
        const actual = sut.layer;

        // Assert
        expect(actual).toBe(3);
      });
    });
  });

  target('toString', () => {
    describe('元の文字列表現を返す', () => {
      // UT-HE-005
      it('生成時の文字列と同一の値を返すこと', () => {
        // Arrange
        const sut = createErrorCode('L2-101');

        // Act
        const actual = sut.toString();

        // Assert
        expect(actual).toBe('L2-101');
      });
    });
  });

  target('equals', () => {
    describe('ErrorCode同士を比較する', () => {
      // UT-HE-006
      it('同一値の場合にtrueを返すこと', () => {
        // Arrange
        const sut = createErrorCode('L1-001');
        const other = createErrorCode('L1-001');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-007
      it('異なる値の場合にfalseを返すこと', () => {
        // Arrange
        const sut = createErrorCode('L1-001');
        const other = createErrorCode('L1-002');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

### 3.2 `severity.test.ts`
```ts
target('Severity', () => {
  target('create', () => {
    describe('有効なseverity文字列からSeverityを生成する', () => {
      // UT-HE-013
      it('errorからSeverityが生成されること', () => {
        // Arrange
        const input = 'error';

        // Act
        const actual = Severity.create(input);

        // Assert
        expect(actual.value).toBe('error');
      });

      // UT-HE-014
      it('warningからSeverityが生成されること', () => {
        // Arrange
        const input = 'warning';

        // Act
        const actual = Severity.create(input);

        // Assert
        expect(actual.value).toBe('warning');
      });

      // UT-HE-018
      it('Object.freezeで凍結されていること', () => {
        // Arrange
        const input = 'warning';

        // Act
        const actual = Severity.create(input);

        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });

    context('infoが渡された場合', () => {
      // UT-HE-019
      it('入力不正として拒否されること', () => {
        // Arrange
        const input = 'info';

        // Act
        const actual = () => Severity.create(input as 'error');

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('空文字が渡された場合', () => {
      // UT-HE-020
      it('入力不正として拒否されること', () => {
        // Arrange
        const input = '';

        // Act
        const actual = () => Severity.create(input as 'error');

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isHigherThan', () => {
    describe('severity間のrank比較を行う', () => {
      // UT-HE-015
      it('errorのrankがwarningより高いことを示すtrueを返すこと', () => {
        // Arrange
        const sut = createSeverity('error');
        const other = createSeverity('warning');

        // Act
        const actual = sut.isHigherThan(other);

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-016
      it('warningのrankがerrorより低いことを示すfalseを返すこと', () => {
        // Arrange
        const sut = createSeverity('warning');
        const other = createSeverity('error');

        // Act
        const actual = sut.isHigherThan(other);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('同一severity同士を比較する', () => {
      // UT-HE-017
      it('trueを返すこと', () => {
        // Arrange
        const sut = createSeverity('warning');
        const other = createSeverity('warning');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.3 `adr-ref.test.ts`
```ts
target('AdrRef', () => {
  target('create', () => {
    describe('有効なADR参照文字列からAdrRefを生成する', () => {
      // UT-HE-021
      it('ADR-001形式の文字列からAdrRefが生成されること', () => {
        // Arrange
        const input = 'ADR-001';

        // Act
        const actual = AdrRef.create(input);

        // Assert
        expect(actual.toString()).toBe('ADR-001');
      });
    });

    context('4桁が渡された場合', () => {
      // UT-HE-024
      it('エラーをthrowすること', () => {
        // Arrange
        const input = 'ADR-0001';

        // Act
        const actual = () => AdrRef.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('連番なしが渡された場合', () => {
      // UT-HE-025
      it('エラーをthrowすること', () => {
        // Arrange
        const input = 'ADR-';

        // Act
        const actual = () => AdrRef.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('形式に一致しない文字列が渡された場合', () => {
      // UT-HE-026
      it('エラーをthrowすること', () => {
        // Arrange
        const input = 'ADR-XYZ';

        // Act
        const actual = () => AdrRef.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('toString', () => {
    describe('元の文字列を返す', () => {
      // UT-HE-022
      it('生成時の文字列と同一の値を返すこと', () => {
        // Arrange
        const sut = createAdrRef('ADR-123');

        // Act
        const actual = sut.toString();

        // Assert
        expect(actual).toBe('ADR-123');
      });
    });
  });

  target('equals', () => {
    describe('同一値のAdrRef同士を比較する', () => {
      // UT-HE-023
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrRef('ADR-123');
        const other = createAdrRef('ADR-123');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.4 `fix-example.test.ts`
```ts
target('FixExample', () => {
  target('create', () => {
    describe('有効なコード片文字列からFixExampleを生成する', () => {
      // UT-HE-027
      it('有効なコード片文字列からFixExampleが生成されること', () => {
        // Arrange
        const input = 'const repaired = true;';

        // Act
        const actual = FixExample.create(input);

        // Assert
        expect(actual.toString()).toBe('const repaired = true;');
      });
    });

    context('空文字が渡された場合', () => {
      // UT-HE-030
      it('エラーをthrowすること', () => {
        // Arrange
        const input = '';

        // Act
        const actual = () => FixExample.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('空白のみの文字列が渡された場合', () => {
      // UT-HE-031
      it('trim後に空文字としてエラーをthrowすること', () => {
        // Arrange
        const input = '   ';

        // Act
        const actual = () => FixExample.create(input);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('toString', () => {
    describe('元の文字列を返す', () => {
      // UT-HE-028
      it('生成時の文字列と同一の値を返すこと', () => {
        // Arrange
        const sut = createFixExample('const value = 1;');

        // Act
        const actual = sut.toString();

        // Assert
        expect(actual).toBe('const value = 1;');
      });
    });
  });

  target('equals', () => {
    describe('同一値のFixExample同士を比較する', () => {
      // UT-HE-029
      it('trueを返すこと', () => {
        // Arrange
        const sut = createFixExample('const value = 1;');
        const other = createFixExample('const value = 1;');

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.5 `fix-example-validation-result.test.ts`
```ts
target('FixExampleValidationResult', () => {
  target('success', () => {
    describe('検証成功の結果を生成する', () => {
      // UT-HE-032
      it('passedがtrueでreasonがnullの結果が生成されること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = FixExampleValidationResult.success(validatorId);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.reason).toBeNull();
      });

      // UT-HE-036
      it('diagnosticsが空配列であること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = FixExampleValidationResult.success(validatorId);

        // Assert
        expect(actual.diagnostics).toEqual([]);
      });
    });
  });

  target('failure', () => {
    describe('検証失敗の結果を生成する', () => {
      // UT-HE-033
      it('passedがfalseでreasonとdiagnosticsが設定されること', () => {
        // Arrange
        const validatorId = 'phase-gate';
        const reason = '構文エラー';
        const diagnostics = ['Unexpected token'];

        // Act
        const actual = FixExampleValidationResult.failure(validatorId, reason, diagnostics);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.reason).toBe('構文エラー');
        expect(actual.diagnostics).toEqual(['Unexpected token']);
      });

      // UT-HE-034
      it('diagnosticsが1件以上あること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = FixExampleValidationResult.failure(validatorId, '構文エラー', ['Unexpected token']);

        // Assert
        expect(actual.diagnostics).toHaveLength(1);
      });
    });

    context('reasonが未指定の場合', () => {
      // UT-HE-037
      it('reasonが必須としてエラーになること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = () =>
          FixExampleValidationResult.failure(validatorId, '' as never, ['Unexpected token']);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('diagnosticsが空配列の場合', () => {
      // UT-HE-038
      it('diagnosticsが1件以上でない制約違反としてエラーになること', () => {
        // Arrange
        const validatorId = 'phase-gate';

        // Act
        const actual = () => FixExampleValidationResult.failure(validatorId, '構文エラー', []);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('equals', () => {
    describe('同一属性の結果同士を比較する', () => {
      // UT-HE-035
      it('trueを返すこと', () => {
        // Arrange
        const sut = createValidationFailure();
        const other = createValidationFailure();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.6 `error-definition.test.ts`
```ts
target('ErrorDefinition', () => {
  target('create', () => {
    describe('全属性を指定してErrorDefinitionを生成する', () => {
      // UT-HE-039
      it('全属性が正しく設定されたErrorDefinitionが生成されること', () => {
        // Arrange
        const params = {
          code: createErrorCode('L2-010'),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: true,
          defaultAdrRef: createAdrRef('ADR-010'),
          fixExampleRequired: true,
          defaultFixExample: createFixExample('const fixedValue = 1;'),
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = ErrorDefinition.create(params);

        // Assert
        expect(actual.code.toString()).toBe('L2-010');
        expect(actual.defaultSeverity.value).toBe('warning');
        expect(actual.requiresAdrRef()).toBe(true);
        expect(actual.requiresFixExample()).toBe(true);
      });

      // UT-HE-050
      it('defaultSeverityがwarningの定義を正常生成できること', () => {
        // Arrange
        const params = {
          code: createErrorCode('L2-011'),
          title: 'warning既定の定義',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: null,
          fixExampleRequired: false,
          defaultFixExample: null,
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = ErrorDefinition.create(params);

        // Assert
        expect(actual.defaultSeverity.value).toBe('warning');
      });
    });

    context('defaultAdrRefを持つがadrRefRequiredがfalseの場合', () => {
      // UT-HE-049
      it('DDD不変条件違反としてエラーをthrowすること', () => {
        // Arrange
        const params = {
          code: createErrorCode(),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: createAdrRef('ADR-010'),
          fixExampleRequired: false,
          defaultFixExample: null,
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = () => ErrorDefinition.create(params);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('fixExampleRequiredがtrueでdefaultFixExampleもexplicitもない場合', () => {
      // UT-HE-051
      it('必須条件違反としてエラーになること', () => {
        // Arrange
        const params = {
          code: createErrorCode(),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: null,
          fixExampleRequired: true,
          defaultFixExample: null,
          ownerValidatorId: 'architecture',
        };

        // Act
        const actual = () => ErrorDefinition.create(params);

        // Assert
        expect(actual).toThrowError();
      });
    });

    context('ownerValidatorIdが空文字の場合', () => {
      // UT-HE-052
      it('入力不正として拒否されること', () => {
        // Arrange
        const params = {
          code: createErrorCode(),
          title: '設計順序違反',
          category: 'architecture',
          defaultSeverity: createSeverity('warning'),
          adrRefRequired: false,
          defaultAdrRef: null,
          fixExampleRequired: false,
          defaultFixExample: null,
          ownerValidatorId: '',
        };

        // Act
        const actual = () => ErrorDefinition.create(params);

        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('requiresAdrRef', () => {
    describe('ADR必須フラグを返す', () => {
      // UT-HE-040
      it('adrRefRequiredがtrueの場合にtrueを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition();

        // Act
        const actual = sut.requiresAdrRef();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('requiresFixExample', () => {
    describe('fix_example必須フラグを返す', () => {
      // UT-HE-041
      it('fixExampleRequiredがtrueの場合にtrueを返すこと', () => {
        // Arrange
        const sut = createFixExampleRequiredDefinition();

        // Act
        const actual = sut.requiresFixExample();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('resolveAdrRef', () => {
    describe('ADRを解決する', () => {
      // UT-HE-042
      it('明示的に渡されたAdrRefを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition({ defaultAdrRef: createAdrRef('ADR-010') });
        const explicitAdrRef = createAdrRef('ADR-011');

        // Act
        const actual = sut.resolveAdrRef(explicitAdrRef);

        // Assert
        expect(actual?.toString()).toBe('ADR-011');
      });

      // UT-HE-043
      it('defaultAdrRefを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition({ defaultAdrRef: createAdrRef('ADR-010') });

        // Act
        const actual = sut.resolveAdrRef(null);

        // Assert
        expect(actual?.toString()).toBe('ADR-010');
      });

      // UT-HE-044
      it('nullを返すこと', () => {
        // Arrange
        const sut = createErrorDefinition({ adrRefRequired: false, defaultAdrRef: null });

        // Act
        const actual = sut.resolveAdrRef(null);

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  target('resolveFixExample', () => {
    describe('fix_exampleを解決する', () => {
      // UT-HE-045
      it('明示的に渡されたFixExampleを返すこと', () => {
        // Arrange
        const sut = createFixExampleRequiredDefinition();
        const explicitFixExample = createFixExample('const explicit = 1;');

        // Act
        const actual = sut.resolveFixExample(explicitFixExample);

        // Assert
        expect(actual?.toString()).toBe('const explicit = 1;');
      });

      // UT-HE-046
      it('defaultFixExampleを返すこと', () => {
        // Arrange
        const sut = createFixExampleRequiredDefinition({
          defaultFixExample: createFixExample('const defaultValue = 1;'),
        });

        // Act
        const actual = sut.resolveFixExample(null);

        // Assert
        expect(actual?.toString()).toBe('const defaultValue = 1;');
      });

      // UT-HE-047
      it('nullを返すこと', () => {
        // Arrange
        const sut = createErrorDefinition({ fixExampleRequired: false, defaultFixExample: null });

        // Act
        const actual = sut.resolveFixExample(null);

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  target('equals', () => {
    describe('同一属性のErrorDefinition同士を比較する', () => {
      // UT-HE-048
      it('trueを返すこと', () => {
        // Arrange
        const sut = createAdrRequiredDefinition({
          code: createErrorCode('L2-010'),
          defaultFixExample: createFixExample('const fixedValue = 1;'),
          fixExampleRequired: true,
        });
        const other = createAdrRequiredDefinition({
          code: createErrorCode('L2-010'),
          defaultFixExample: createFixExample('const fixedValue = 1;'),
          fixExampleRequired: true,
        });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.7 `harness-error.test.ts`
```ts
target('HarnessError', () => {
  target('equals', () => {
    describe('HarnessError同士を比較する', () => {
      // UT-HE-053
      it('全フィールドが一致する場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({
          adrRef: createAdrRef('ADR-010'),
          fixExample: createFixExample('const fixedValue = 1;'),
        });
        const other = buildHarnessError({
          adrRef: createAdrRef('ADR-010'),
          fixExample: createFixExample('const fixedValue = 1;'),
        });

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-060
      it('全必須属性が一致する場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError();
        const other = buildHarnessError();

        // Act
        const actual = sut.equals(other);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  target('hasAdrRef', () => {
    describe('adrRef保持有無を返す', () => {
      // UT-HE-054
      it('adrRefを持つ場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ adrRef: createAdrRef('ADR-010') });

        // Act
        const actual = sut.hasAdrRef();

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-055
      it('adrRefを持たない場合にfalseを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ adrRef: null });

        // Act
        const actual = sut.hasAdrRef();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('hasFixExample', () => {
    describe('fixExample保持有無を返す', () => {
      // UT-HE-056
      it('fixExampleを持つ場合にtrueを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ fixExample: createFixExample('const fixedValue = 1;') });

        // Act
        const actual = sut.hasFixExample();

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-057
      it('fixExampleを持たない場合にfalseを返すこと', () => {
        // Arrange
        const sut = buildHarnessError({ fixExample: null });

        // Act
        const actual = sut.hasFixExample();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('toContract', () => {
    describe('Shared Kernel公開DTOへ変換する', () => {
      // UT-HE-058
      it('全フィールドが正しく投影されること', () => {
        // Arrange
        const sut = buildHarnessError({
          code: createErrorCode('L2-010'),
          severity: createSeverity('error'),
          message: '設計順序違反',
          suggestion: '設計書を確認する',
          adrRef: createAdrRef('ADR-010'),
          fixExample: createFixExample('const fixedValue = 1;'),
        });

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual).toEqual({
          code: 'L2-010',
          severity: 'error',
          message: '設計順序違反',
          suggestion: '設計書を確認する',
          adr_ref: 'ADR-010',
          fix_example: 'const fixedValue = 1;',
        });
      });

      // UT-HE-059
      it('戻り値がObject.freezeで凍結されていること', () => {
        // Arrange
        const sut = buildHarnessError();

        // Act
        const actual = sut.toContract();

        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
```

### 3.8 `harness-error-factory.test.ts`
```ts
target('HarnessErrorFactory', () => {
  target('create', () => {
    describe('全条件を満たすパラメータからHarnessErrorを生成する', () => {
      // UT-HE-061
      it('HarnessErrorが正常に生成されること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L1-001'),
          defaultSeverity: createSeverity('warning'),
        });
        const { sut, adrExistenceCheckerPort, fixExampleValidatorPort } = createFactory({
          definitions: [definition],
        });
        const params = createFactoryParams({ code: 'L1-001', adrRef: null, fixExample: null });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.code.toString()).toBe('L1-001');
        expect(actual.severity.value).toBe('warning');
        expect(adrExistenceCheckerPort.exists).not.toHaveBeenCalled();
        expect(fixExampleValidatorPort.validate).not.toHaveBeenCalled();
      });

      // UT-HE-062
      it('requestedSeverity未指定時にdefaultSeverityが使用されること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L1-002'),
          defaultSeverity: createSeverity('warning'),
        });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-002',
          requestedSeverity: undefined,
          adrRef: null,
          fixExample: null,
        });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.severity.value).toBe('warning');
      });

      // UT-HE-063
      it('格上げが許容されerrorのHarnessErrorが生成されること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L1-003'),
          defaultSeverity: createSeverity('warning'),
        });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-003',
          requestedSeverity: 'error',
          adrRef: null,
          fixExample: null,
        });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.severity.value).toBe('error');
      });

      // UT-HE-064
      it('adrRef省略時にdefaultAdrRefが適用されること', async () => {
        // Arrange
        const definition = createAdrRequiredDefinition({
          code: createErrorCode('L1-004'),
          defaultAdrRef: createAdrRef('ADR-010'),
        });
        const { sut, adrExistenceCheckerPort } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-004',
          adrRef: undefined,
          fixExample: null,
        });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.adrRef?.toString()).toBe('ADR-010');
        expect(adrExistenceCheckerPort.exists).toHaveBeenCalledTimes(1);
      });

      // UT-HE-065
      it('fixExample省略時にdefaultFixExampleが適用されること', async () => {
        // Arrange
        const definition = createFixExampleRequiredDefinition({
          code: createErrorCode('L1-005'),
          defaultFixExample: createFixExample('const fromDefault = 1;'),
        });
        const { sut, fixExampleValidatorPort } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-005',
          adrRef: null,
          fixExample: undefined,
        });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.fixExample?.toString()).toBe('const fromDefault = 1;');
        expect(fixExampleValidatorPort.validate).toHaveBeenCalledTimes(1);
      });

      // UT-HE-066
      it('生成されたHarnessErrorがObject.freezeで凍結されていること', async () => {
        // Arrange
        const definition = createErrorDefinition({ code: createErrorCode('L1-006') });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-006',
          adrRef: null,
          fixExample: null,
        });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });

    context('未登録のErrorCodeが渡された場合', () => {
      // UT-HE-067
      it('UnknownErrorDefinitionErrorをthrowすること', async () => {
        // Arrange
        const { sut } = createFactory({ definitions: [] });
        const params = createFactoryParams({ code: 'L1-999' });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(UnknownErrorDefinitionError);
      });
    });

    context('errorからwarningへの格下げが要求された場合', () => {
      // UT-HE-068
      it('SeverityDowngradeViolationErrorをthrowすること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L1-007'),
          defaultSeverity: createSeverity('error'),
        });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-007',
          requestedSeverity: 'warning',
          adrRef: null,
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(SeverityDowngradeViolationError);
      });
    });

    context('adrRefRequiredがtrueでadr_refが未指定の場合', () => {
      // UT-HE-069
      it('MissingAdrRefErrorをthrowすること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L1-008'),
          adrRefRequired: true,
          defaultAdrRef: null,
        });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-008',
          adrRef: undefined,
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(MissingAdrRefError);
      });
    });

    context('ADR実在性検証が失敗した場合', () => {
      // UT-HE-070
      it('AdrReferenceNotFoundErrorをthrowすること', async () => {
        // Arrange
        const definition = createAdrRequiredDefinition({ code: createErrorCode('L1-009') });
        const { sut } = createFactory({ definitions: [definition], adrExists: false });
        const params = createFactoryParams({
          code: 'L1-009',
          adrRef: 'ADR-010',
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(AdrReferenceNotFoundError);
      });
    });

    context('fixExampleRequiredがtrueでfix_exampleが未指定の場合', () => {
      // UT-HE-071
      it('MissingFixExampleErrorをthrowすること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L1-010'),
          fixExampleRequired: true,
          defaultFixExample: null,
        });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-010',
          adrRef: null,
          fixExample: undefined,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(MissingFixExampleError);
      });
    });

    context('fix_example構文検証が失敗した場合', () => {
      // UT-HE-072
      it('InvalidFixExampleErrorをthrowすること', async () => {
        // Arrange
        const definition = createFixExampleRequiredDefinition({ code: createErrorCode('L1-011') });
        const { sut } = createFactory({
          definitions: [definition],
          validationResult: createValidationFailure('phase-gate', '構文エラー', ['Unexpected token']),
        });
        const params = createFactoryParams({
          code: 'L1-011',
          adrRef: null,
          fixExample: 'const =',
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(InvalidFixExampleError);
      });
    });

    context('messageが空文字の場合', () => {
      // UT-HE-073
      it('EmptyMessageErrorをthrowすること', async () => {
        // Arrange
        const definition = createErrorDefinition({ code: createErrorCode('L1-012') });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-012',
          message: '',
          adrRef: null,
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(EmptyMessageError);
      });
    });

    context('suggestionが空文字の場合', () => {
      // UT-HE-074
      it('EmptySuggestionErrorをthrowすること', async () => {
        // Arrange
        const definition = createErrorDefinition({ code: createErrorCode('L1-013') });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-013',
          suggestion: '',
          adrRef: null,
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(EmptySuggestionError);
      });
    });

    context('adr_refがADR形式に準拠しない場合', () => {
      // UT-HE-075
      it('形式不正としてエラーをthrowすること', async () => {
        // Arrange
        const definition = createAdrRequiredDefinition({ code: createErrorCode('L1-014') });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L1-014',
          adrRef: 'ADR-XYZ',
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError();
      });
    });

    context('FixExampleValidatorPortが失敗を返した場合', () => {
      // UT-HE-076
      it('InvalidFixExampleErrorをthrowすること', async () => {
        // Arrange
        const definition = createFixExampleRequiredDefinition({ code: createErrorCode('L1-015') });
        const { sut, fixExampleValidatorPort } = createFactory({
          definitions: [definition],
          validationResult: createValidationFailure('phase-gate', '再検証失敗', ['Rule mismatch']),
        });
        const params = createFactoryParams({
          code: 'L1-015',
          adrRef: null,
          fixExample: 'const fixedValue = 1;',
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(InvalidFixExampleError);
        expect(fixExampleValidatorPort.validate).toHaveBeenCalledTimes(1);
      });
    });

    context('AdrExistenceCheckerPortがfalseを返した場合', () => {
      // UT-HE-077
      it('AdrReferenceNotFoundErrorをthrowすること', async () => {
        // Arrange
        const definition = createAdrRequiredDefinition({ code: createErrorCode('L1-016') });
        const { sut, adrExistenceCheckerPort } = createFactory({
          definitions: [definition],
          adrExists: false,
        });
        const params = createFactoryParams({
          code: 'L1-016',
          adrRef: 'ADR-010',
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(AdrReferenceNotFoundError);
        expect(adrExistenceCheckerPort.exists).toHaveBeenCalledWith(expect.any(AdrRef));
      });
    });

    context('ErrorCodeがL形式に準拠しない場合', () => {
      // UT-HE-078
      it('InvalidErrorCodeErrorをthrowすること', async () => {
        // Arrange
        const definition = createErrorDefinition({ code: createErrorCode('L1-017') });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'INVALID',
          adrRef: null,
          fixExample: null,
        });

        // Act
        const actual = () => sut.create(params);

        // Assert
        await expect(actual).rejects.toThrowError(InvalidErrorCodeError);
      });
    });
  });
});
```

### 3.9 `error-definition-registry.test.ts`
```ts
target('ErrorDefinitionRegistry', () => {
  target('constructor', () => {
    context('重複codeのErrorDefinitionが渡された場合', () => {
      // UT-HE-089
      it('DuplicateErrorCodeErrorをthrowすること', () => {
        // Arrange
        const duplicateCode = createErrorCode('L1-001');
        const definitions = [
          createErrorDefinition({ code: duplicateCode }),
          createErrorDefinition({ code: duplicateCode }),
        ];

        // Act
        const actual = () => new ErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrowError(DuplicateErrorCodeError);
      });
    });

    describe('空の定義配列でレジストリを構築する', () => {
      // UT-HE-092
      it('正常に構築されること', () => {
        // Arrange
        const definitions: ErrorDefinition[] = [];

        // Act
        const actual = new ErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual.getAllDefinitions()).toEqual([]);
      });
    });
  });

  target('getDefinition', () => {
    describe('登録済みコードに対して定義を取得する', () => {
      // UT-HE-079
      it('対応するErrorDefinitionが返されること', () => {
        // Arrange
        const definition = createErrorDefinition({ code: createErrorCode('L2-010') });
        const sut = createRegistry([definition]);

        // Act
        const actual = sut.getDefinition(createErrorCode('L2-010'));

        // Assert
        expect(actual.equals(definition)).toBe(true);
      });
    });

    context('未登録コードが指定された場合', () => {
      // UT-HE-080
      it('UnknownErrorDefinitionErrorをthrowすること', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L2-010') })]);

        // Act
        const actual = () => sut.getDefinition(createErrorCode('L2-999'));

        // Assert
        expect(actual).toThrowError(UnknownErrorDefinitionError);
      });
    });
  });

  target('getAllDefinitions', () => {
    describe('全定義を返す', () => {
      // UT-HE-081
      it('code昇順で全定義が返されること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L2-020') }),
          createErrorDefinition({ code: createErrorCode('L1-010') }),
          createErrorDefinition({ code: createErrorCode('L1-002') }),
        ]);

        // Act
        const actual = sut.getAllDefinitions();

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual([
          'L1-002',
          'L1-010',
          'L2-020',
        ]);
      });

      // UT-HE-082
      it('readonly配列が返されること', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition()]);

        // Act
        const actual = sut.getAllDefinitions();

        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });

  target('listByValidator', () => {
    describe('指定validatorIdの定義のみを返す', () => {
      // UT-HE-083
      it('該当validatorIdの定義のみが含まれること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L1-001'), ownerValidatorId: 'phase-gate' }),
          createErrorDefinition({ code: createErrorCode('L1-002'), ownerValidatorId: 'security' }),
          createErrorDefinition({ code: createErrorCode('L1-003'), ownerValidatorId: 'phase-gate' }),
        ]);

        // Act
        const actual = sut.listByValidator('phase-gate');

        // Assert
        expect(actual.map((definition) => definition.ownerValidatorId)).toEqual([
          'phase-gate',
          'phase-gate',
        ]);
      });

      // UT-HE-090
      it('code昇順で返されること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L1-010'), ownerValidatorId: 'phase-gate' }),
          createErrorDefinition({ code: createErrorCode('L1-002'), ownerValidatorId: 'phase-gate' }),
        ]);

        // Act
        const actual = sut.listByValidator('phase-gate');

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual(['L1-002', 'L1-010']);
      });
    });

    context('該当するvalidatorIdが存在しない場合', () => {
      // UT-HE-084
      it('空配列を返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ ownerValidatorId: 'phase-gate' })]);

        // Act
        const actual = sut.listByValidator('security');

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('listByLayer', () => {
    describe('指定layerの定義のみを返す', () => {
      // UT-HE-085
      it('該当layerの定義のみが含まれること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L1-001') }),
          createErrorDefinition({ code: createErrorCode('L2-001') }),
          createErrorDefinition({ code: createErrorCode('L1-002') }),
        ]);

        // Act
        const actual = sut.listByLayer(1);

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual(['L1-001', 'L1-002']);
      });

      // UT-HE-091
      it('code昇順で返されること', () => {
        // Arrange
        const sut = createRegistry([
          createErrorDefinition({ code: createErrorCode('L2-010') }),
          createErrorDefinition({ code: createErrorCode('L2-002') }),
        ]);

        // Act
        const actual = sut.listByLayer(2);

        // Assert
        expect(actual.map((definition) => definition.code.toString())).toEqual(['L2-002', 'L2-010']);
      });
    });

    context('該当するlayerの定義が存在しない場合', () => {
      // UT-HE-086
      it('空配列を返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L1-001') })]);

        // Act
        const actual = sut.listByLayer(4);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('hasDefinition', () => {
    describe('コード存在有無を返す', () => {
      // UT-HE-087
      it('登録済みコードに対してtrueを返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L1-001') })]);

        // Act
        const actual = sut.hasDefinition(createErrorCode('L1-001'));

        // Assert
        expect(actual).toBe(true);
      });

      // UT-HE-088
      it('未登録コードに対してfalseを返すこと', () => {
        // Arrange
        const sut = createRegistry([createErrorDefinition({ code: createErrorCode('L1-001') })]);

        // Act
        const actual = sut.hasDefinition(createErrorCode('L1-999'));

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

### 3.10 `severity-contract-enforcer.test.ts`
```ts
target('SeverityContractEnforcer', () => {
  target('resolveEffectiveSeverity', () => {
    describe('effective severityを解決する', () => {
      // UT-HE-093
      it('requested未指定時にdefaultSeverityが返されること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('warning');

        // Act
        const actual = sut.resolveEffectiveSeverity(undefined, defaultSeverity);

        // Assert
        expect(actual.value).toBe('warning');
      });

      // UT-HE-094
      it('requestedがdefaultと同一の場合にrequestedが返されること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('warning');
        const requestedSeverity = createSeverity('warning');

        // Act
        const actual = sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual.value).toBe('warning');
      });

      // UT-HE-095
      it('warningからerrorへの格上げ時にerrorが返されること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('warning');
        const requestedSeverity = createSeverity('error');

        // Act
        const actual = sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual.value).toBe('error');
      });

      // UT-HE-100
      it('defaultSeverityがerrorでrequestedもerrorの場合にerrorが返されること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('error');
        const requestedSeverity = createSeverity('error');

        // Act
        const actual = sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual.value).toBe('error');
      });

      // UT-HE-101
      it('defaultSeverityがwarningでrequestedもwarningの場合にwarningが返されること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('warning');
        const requestedSeverity = createSeverity('warning');

        // Act
        const actual = sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual.value).toBe('warning');
      });
    });

    context('errorからwarningへの格下げが要求された場合', () => {
      // UT-HE-096
      it('SeverityDowngradeViolationErrorをthrowすること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('error');
        const requestedSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).toThrowError(SeverityDowngradeViolationError);
      });
    });

    context('defaultSeverityがerrorでrequestedがwarningの場合', () => {
      // UT-HE-102
      it('SeverityDowngradeViolationErrorをthrowすること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('error');
        const requestedSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).toThrowError(SeverityDowngradeViolationError);
      });
    });
  });

  target('assertNoDowngrade', () => {
    describe('格下げ検出を行う', () => {
      // UT-HE-098
      it('格上げの場合に例外をthrowしないこと', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const requestedSeverity = createSeverity('error');
        const defaultSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.assertNoDowngrade(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).not.toThrow();
      });

      // UT-HE-099
      it('同一severityの場合に例外をthrowしないこと', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const requestedSeverity = createSeverity('warning');
        const defaultSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.assertNoDowngrade(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).not.toThrow();
      });
    });

    context('格下げが検出された場合', () => {
      // UT-HE-097
      it('SeverityDowngradeViolationErrorをthrowすること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const requestedSeverity = createSeverity('warning');
        const defaultSeverity = createSeverity('error');

        // Act
        const actual = () => sut.assertNoDowngrade(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).toThrowError(SeverityDowngradeViolationError);
      });
    });
  });
});
```

### 3.11 `harness-error-contract.test.ts`
```ts
target('isHarnessError', () => {
  describe('HarnessError契約オブジェクトを判定する', () => {
    // UT-HE-103
    it('全必須フィールドを持つオブジェクトに対してtrueを返すこと', () => {
      // Arrange
      const input = createContractObject({ adr_ref: undefined, fix_example: undefined });

      // Act
      const actual = isHarnessError(input);

      // Assert
      expect(actual).toBe(true);
    });

    // UT-HE-104
    it('adr_refとfix_exampleを含むオブジェクトに対してtrueを返すこと', () => {
      // Arrange
      const input = createContractObject();

      // Act
      const actual = isHarnessError(input);

      // Assert
      expect(actual).toBe(true);
    });
  });

  context('codeフィールドが欠落している場合', () => {
    // UT-HE-105
    it('falseを返すこと', () => {
      // Arrange
      const input = {
        severity: 'warning',
        message: '違反を検出しました',
        suggestion: '設計書を確認してください',
      };

      // Act
      const actual = isHarnessError(input);

      // Assert
      expect(actual).toBe(false);
    });
  });

  context('severityが不正な値の場合', () => {
    // UT-HE-106
    it('falseを返すこと', () => {
      // Arrange
      const input = createContractObject({ severity: 'info' as never });

      // Act
      const actual = isHarnessError(input);

      // Assert
      expect(actual).toBe(false);
    });
  });

  context('nullが渡された場合', () => {
    // UT-HE-107
    it('falseを返すこと', () => {
      // Arrange
      const input = null;

      // Act
      const actual = isHarnessError(input);

      // Assert
      expect(actual).toBe(false);
    });
  });

  context('undefinedが渡された場合', () => {
    // UT-HE-108
    it('falseを返すこと', () => {
      // Arrange
      const input = undefined;

      // Act
      const actual = isHarnessError(input);

      // Assert
      expect(actual).toBe(false);
    });
  });

  context('プリミティブ値が渡された場合', () => {
    // UT-HE-109
    it('falseを返すこと', () => {
      // Arrange
      const input = 'invalid';

      // Act
      const actual = isHarnessError(input);

      // Assert
      expect(actual).toBe(false);
    });
  });
});

target('HarnessErrorContract', () => {
  describe('HarnessError.toContract()の戻り値が契約形式に準拠する', () => {
    // UT-HE-110
    it('各フィールドが文字列として投影されていること', () => {
      // Arrange
      const sut = buildHarnessError({
        code: createErrorCode('L2-010'),
        severity: createSeverity('error'),
        message: '設計順序違反',
        suggestion: '設計書を確認する',
        adrRef: createAdrRef('ADR-010'),
        fixExample: createFixExample('const fixedValue = 1;'),
      });

      // Act
      const actual = sut.toContract();

      // Assert
      expect(typeof actual.code).toBe('string');
      expect(typeof actual.severity).toBe('string');
      expect(typeof actual.message).toBe('string');
      expect(typeof actual.suggestion).toBe('string');
      expect(typeof actual.adr_ref).toBe('string');
      expect(typeof actual.fix_example).toBe('string');
    });

    // UT-HE-111
    it('契約DTOが変更不可であること', () => {
      // Arrange
      const sut = buildHarnessError();

      // Act
      const actual = sut.toContract();

      // Assert
      expect(Object.isFrozen(actual)).toBe(true);
    });
  });
});
```

## 4. モック戦略
- 値オブジェクトとドメインサービスはモックしない。`ErrorCode`、`Severity`、`AdrRef`、`FixExample`、`FixExampleValidationResult`、`ErrorDefinition`、`HarnessError`、`ErrorDefinitionRegistry`、`SeverityContractEnforcer` はすべて実体生成する。
- `HarnessErrorFactory` だけは外部境界をまたぐ `AdrExistenceCheckerPort` と `FixExampleValidatorPort` をスタブ化する。`vi.fn().mockResolvedValue(...)` で即時解決し、待機・再試行・並列性は扱わない。
- Shared Kernel契約テストでは外部依存は不要。契約DTOと型ガードへ素のオブジェクトを渡す。
- モック不要の判断基準は「純粋な値検証か、同一Unit内の不変条件検証か」。モック必要の判断基準は「ファイルシステム参照や外部バリデータ呼び出しなどPort境界を越えるか」。

## 5. 境界値テスト一覧
| ケースID | 対象 | 境界条件 | 入力例 | 期待結果 |
|---|---|---|---|---|
| UT-HE-001 | ErrorCode | layer最小、3桁連番最小 | `L0-001` | 正常生成される |
| UT-HE-002 | ErrorCode | layer最大、3桁連番上限 | `L4-999` | 正常生成される |
| UT-HE-003 | ErrorCode | 4桁連番拡張 | `L0-0001` | 正常生成される |
| UT-HE-009 | ErrorCode | layer範囲外 | `L5-001` | `InvalidErrorCodeError` |
| UT-HE-011 | ErrorCode | 桁数不足 | `L2-01` | `InvalidErrorCodeError` |
| UT-HE-021 | AdrRef | 3桁最小 | `ADR-001` | 正常生成される |
| UT-HE-024 | AdrRef | 4桁超過 | `ADR-0001` | 形式不正で失敗する |
| UT-HE-027 | FixExample | 最小有効ケース | `const repaired = true;` | 正常生成される |
| UT-HE-030 | FixExample | 空文字 | `''` | 失敗する |
| UT-HE-031 | FixExample | trim後空文字 | `'   '` | 失敗する |
| UT-HE-013 | Severity | 許容上位値 | `error` | 正常生成される |
| UT-HE-014 | Severity | 許容下位値 | `warning` | 正常生成される |
| UT-HE-019 | Severity | 非許容値 | `info` | 失敗する |
| UT-HE-034 | FixExampleValidationResult | diagnostics最小件数 | `['Unexpected token']` | 正常生成される |
| UT-HE-038 | FixExampleValidationResult | diagnostics空配列 | `[]` | 失敗する |
| UT-HE-089 | ErrorDefinitionRegistry | 重複code | `['L1-001', 'L1-001']` | `DuplicateErrorCodeError` |
| UT-HE-092 | ErrorDefinitionRegistry | 0件 | `[]` | 正常構築される |
| UT-HE-100 | SeverityContractEnforcer | error同値比較 | `default=error, requested=error` | `error` を返す |
| UT-HE-101 | SeverityContractEnforcer | warning同値比較 | `default=warning, requested=warning` | `warning` を返す |
| UT-HE-102 | SeverityContractEnforcer | 格下げ境界 | `default=error, requested=warning` | `SeverityDowngradeViolationError` |
