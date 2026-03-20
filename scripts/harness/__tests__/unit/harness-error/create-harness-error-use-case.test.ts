/**
 * @layer application
 * @unit harness-error
 *
 * CreateHarnessErrorUseCase のユニットテスト
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { CreateHarnessErrorInput } from '../../../harness-error/application/dto/create-harness-error-input.js';
import { HarnessErrorContractMapper } from '../../../harness-error/application/mappers/harness-error-contract-mapper.js';
import { CreateHarnessErrorUseCase } from '../../../harness-error/application/usecases/create-harness-error-use-case.js';
import { InvalidErrorCodeError } from '../../../harness-error/domain/errors/invalid-error-code-error.js';
import { SeverityDowngradeViolationError } from '../../../harness-error/domain/errors/severity-downgrade-violation-error.js';
import { ErrorDefinitionRegistry } from '../../../harness-error/domain/services/error-definition-registry.js';
import { HarnessErrorFactory } from '../../../harness-error/domain/services/harness-error-factory.js';
import { SeverityContractEnforcer } from '../../../harness-error/domain/services/severity-contract-enforcer.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { FixExampleValidationResult } from '../../../harness-error/domain/value-objects/fix-example-validation-result.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);
const createAdrRef = (value = 'ADR-001') => AdrRef.create(value);
const createFixExample = (value = 'const repaired = true;') => FixExample.create(value);

const createValidationSuccess = (validatorId = 'phase-gate') =>
  FixExampleValidationResult.success(validatorId);

const createErrorDefinition = (overrides: Partial<ErrorDefinitionProps> = {}) =>
  ErrorDefinition.create({
    code: createErrorCode(),
    title: 'フェーズゲート違反',
    category: 'phase_gate',
    defaultSeverity: createSeverity('error'),
    adrRefRequired: false,
    defaultAdrRef: null,
    fixExampleRequired: true,
    defaultFixExample: createFixExample('const fixedValue = true;'),
    ownerValidatorId: 'phase-gate',
    ...overrides,
  });

const createRegistry = () =>
  new ErrorDefinitionRegistry([
    createErrorDefinition({
      code: createErrorCode('L1-001'),
      defaultSeverity: createSeverity('error'),
      ownerValidatorId: 'phase-gate',
      category: 'phase_gate',
    }),
    createErrorDefinition({
      code: createErrorCode('L1-002'),
      defaultSeverity: createSeverity('warning'),
      ownerValidatorId: 'architecture',
      category: 'architecture',
      title: 'アーキテクチャ違反',
      defaultFixExample: createFixExample('const architectureFixed = true;'),
    }),
  ]);

const buildCreateHarnessErrorInput = (
  overrides: Partial<CreateHarnessErrorInput> = {}
): CreateHarnessErrorInput => ({
  code: 'L1-001',
  message: '違反を検出しました',
  suggestion: '設計書を確認してください',
  severity: 'error',
  adrRef: undefined,
  fixExample: undefined,
  validatorId: 'phase-gate',
  ...overrides,
});

const createSut = () => {
  const registry = createRegistry();
  const adrExistenceCheckerPort = {
    exists: vi.fn().mockResolvedValue(true),
  };
  const fixExampleValidatorPort = {
    validate: vi.fn().mockResolvedValue(createValidationSuccess()),
  };
  const harnessErrorFactory = new HarnessErrorFactory({
    registry,
    severityContractEnforcer: new SeverityContractEnforcer(),
    adrExistenceCheckerPort,
    fixExampleValidatorPort,
  });
  const contractMapper = new HarnessErrorContractMapper();
  const sut = new CreateHarnessErrorUseCase({
    harnessErrorFactory,
    contractMapper,
  });

  return { sut, adrExistenceCheckerPort, fixExampleValidatorPort };
};

target('CreateHarnessErrorUseCase.execute', () => {
  describe('単一draftをHarnessErrorContractへ変換する', () => {
    context('登録済みcodeと必須項目が妥当な場合', () => {
      // IT-HE-001
      it('有効な入力からHarnessErrorContractが生成されること', async () => {
        // Arrange
        const { sut } = createSut();
        const input = buildCreateHarnessErrorInput();

        // Act
        const actual = await sut.execute(input);

        // Assert
        expect(actual).toMatchObject({
          code: 'L1-001',
          severity: 'error',
          message: input.message,
          suggestion: input.suggestion,
        });
      });

      // IT-HE-002
      it('生成されたDTOのcodeが文字列で返されること', async () => {
        // Arrange
        const { sut } = createSut();
        const input = buildCreateHarnessErrorInput();

        // Act
        const actual = await sut.execute(input);

        // Assert
        expect(typeof actual.code).toBe('string');
      });

      // IT-HE-003
      it('生成されたDTOのseverityが正しく投影されること', async () => {
        // Arrange
        const { sut } = createSut();
        const input = buildCreateHarnessErrorInput({
          code: 'L1-002',
          severity: 'warning',
          validatorId: 'architecture',
        });

        // Act
        const actual = await sut.execute(input);

        // Assert
        expect(actual.severity).toBe('warning');
      });

    });

    context('adrRefが指定される場合', () => {
      // IT-HE-005
      it('adr_refフィールドを含むDTOが返されること', async () => {
        // Arrange
        const { sut, adrExistenceCheckerPort } = createSut();
        const input = buildCreateHarnessErrorInput({ adrRef: 'ADR-001' });

        // Act
        const actual = await sut.execute(input);

        // Assert
        expect(actual.adr_ref).toBe('ADR-001');
        expect(adrExistenceCheckerPort.exists).toHaveBeenCalledWith(
          createAdrRef('ADR-001')
        );
      });
    });

    context('fixExampleが指定される場合', () => {
      // IT-HE-006
      it('fix_exampleフィールドを含むDTOが返されること', async () => {
        // Arrange
        const { sut, fixExampleValidatorPort } = createSut();
        const input = buildCreateHarnessErrorInput({
          fixExample: 'const fixed = true;',
        });

        // Act
        const actual = await sut.execute(input);

        // Assert
        expect(actual.fix_example).toBe('const fixed = true;');
        expect(fixExampleValidatorPort.validate).toHaveBeenCalledTimes(1);
      });
    });

    context('codeが正規形式ではない場合', () => {
      // IT-HE-007
      it('ドメインエラーが伝播すること', async () => {
        // Arrange
        const { sut } = createSut();
        const input = buildCreateHarnessErrorInput({ code: 'L2-PHASE-GATE' });

        // Act
        const actual = sut.execute(input);

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });
    });

    context('定義severityの格下げを要求する場合', () => {
      // IT-HE-008
      it('severity格下げ時にドメインエラーが伝播すること', async () => {
        // Arrange
        const { sut } = createSut();
        const input = buildCreateHarnessErrorInput({
          code: 'L1-001',
          severity: 'warning',
        });

        // Act
        const actual = sut.execute(input);

        // Assert
        await expect(actual).rejects.toThrow(SeverityDowngradeViolationError);
      });
    });
  });
});
