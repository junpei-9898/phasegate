/**
 * @layer application
 * @unit harness-error
 *
 * ValidateAllFixExamplesUseCase のユニットテスト
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ValidateAllFixExamplesUseCase } from '../../../harness-error/application/usecases/validate-all-fix-examples-use-case.js';
import { ValidateFixExampleUseCase } from '../../../harness-error/application/usecases/validate-fix-example-use-case.js';
import { ErrorDefinitionRegistry } from '../../../harness-error/domain/services/error-definition-registry.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { FixExampleValidationResult } from '../../../harness-error/domain/value-objects/fix-example-validation-result.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);
const createFixExample = (value = 'const repaired = true;') => FixExample.create(value);

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
      ownerValidatorId: 'phase-gate',
      category: 'phase_gate',
      defaultFixExample: createFixExample('const phaseGateFixed = true;'),
    }),
    createErrorDefinition({
      code: createErrorCode('L1-002'),
      ownerValidatorId: 'architecture',
      category: 'architecture',
      title: 'アーキテクチャ違反',
      defaultSeverity: createSeverity('warning'),
      defaultFixExample: createFixExample('const architectureFixed = true;'),
    }),
    createErrorDefinition({
      code: createErrorCode('L2-010'),
      ownerValidatorId: 'dependency',
      category: 'dependency',
      title: '依存違反',
      defaultSeverity: createSeverity('warning'),
      defaultFixExample: createFixExample('const dependencyFixed = true;'),
    }),
    createErrorDefinition({
      code: createErrorCode('L4-001'),
      ownerValidatorId: 'drift-detector',
      category: 'consistency',
      title: 'ドリフト検出',
      defaultSeverity: createSeverity('warning'),
      defaultFixExample: createFixExample('const driftFixed = true;'),
    }),
  ]);

const createSut = (validateMock?: ReturnType<typeof vi.fn>) => {
  const registry = createRegistry();
  const fixExampleValidator = {
    validate:
      validateMock ??
      vi.fn().mockResolvedValue(FixExampleValidationResult.success('phase-gate')),
  };
  const validateFixExampleUseCase = new ValidateFixExampleUseCase({
    errorDefinitionRegistry: registry,
    fixExampleValidator,
  });
  const sut = new ValidateAllFixExamplesUseCase({
    errorDefinitionRegistry: registry,
    validateFixExampleUseCase,
  });

  return { sut, registry };
};

target('ValidateAllFixExamplesUseCase.execute', () => {
  describe('複数定義のfix_exampleを一括検証する', () => {
    context('フィルタなしで全件処理する場合', () => {
      // IT-HE-027
      it('全定義のfix_exampleが一括検証されること', async () => {
        // Arrange
        const { sut, registry } = createSut();

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual.results).toHaveLength(registry.getAllDefinitions().length);
      });

      // IT-HE-031
      it('failFast=falseの場合は全件検証されること', async () => {
        // Arrange
        const validateMock = vi
          .fn()
          .mockResolvedValueOnce(
            FixExampleValidationResult.failure('phase-gate', 'first fail', ['first fail'])
          )
          .mockResolvedValue(FixExampleValidationResult.success('phase-gate'));
        const { sut, registry } = createSut(validateMock);

        // Act
        const actual = await sut.execute({ failFast: false });

        // Assert
        expect(actual.results).toHaveLength(registry.getAllDefinitions().length);
      });

      // IT-HE-032
      it('summaryのtotalとpassedとfailedが正しく集計されること', async () => {
        // Arrange
        const validateMock = vi
          .fn()
          .mockResolvedValueOnce(FixExampleValidationResult.success('phase-gate'))
          .mockResolvedValueOnce(
            FixExampleValidationResult.failure('architecture', 'fail', ['fail'])
          )
          .mockResolvedValue(FixExampleValidationResult.success('dependency'));
        const { sut } = createSut(validateMock);

        // Act
        const actual = await sut.execute({ failFast: false });

        // Assert
        expect(actual.summary).toMatchObject({
          total: actual.results.length,
          passed: actual.results.filter((result) => result.passed).length,
          failed: actual.results.filter((result) => !result.passed).length,
        });
      });
    });

    context('layerフィルタを指定する場合', () => {
      // IT-HE-028
      it('layerフィルタが適用されること', async () => {
        // Arrange
        const { sut } = createSut();

        // Act
        const actual = await sut.execute({ layer: 'L1' });

        // Assert
        expect(actual.results.every((result) => result.code.startsWith('L1-'))).toBe(true);
      });
    });

    context('validatorIdフィルタを指定する場合', () => {
      // IT-HE-029
      it('validatorIdフィルタが適用されること', async () => {
        // Arrange
        const { sut } = createSut();

        // Act
        const actual = await sut.execute({ validatorId: 'phase-gate' });

        // Assert
        expect(actual.results.every((result) => result.validatorId === 'phase-gate')).toBe(true);
      });
    });

    context('failFast=trueの場合', () => {
      // IT-HE-030
      it('最初の失敗で打ち切られること', async () => {
        // Arrange
        const validateMock = vi
          .fn()
          .mockResolvedValueOnce(FixExampleValidationResult.success('phase-gate'))
          .mockResolvedValueOnce(
            FixExampleValidationResult.failure('architecture', 'first fail', ['first fail'])
          )
          .mockResolvedValue(FixExampleValidationResult.success('dependency'));
        const { sut, registry } = createSut(validateMock);

        // Act
        const actual = await sut.execute({ failFast: true });

        // Assert
        expect(actual.results.some((result) => result.passed === false)).toBe(true);
        expect(actual.results.length).toBeLessThan(registry.getAllDefinitions().length);
      });
    });

    context('フィルタ条件に一致する定義がない場合', () => {
      // IT-HE-033
      it('total=0で返されること', async () => {
        // Arrange
        const { sut } = createSut();

        // Act
        const actual = await sut.execute({ validatorId: 'unknown-validator' });

        // Assert
        expect(actual.summary).toMatchObject({ total: 0, passed: 0, failed: 0 });
      });
    });

    context('単体検証で例外が発生する場合', () => {
      // IT-HE-034
      it('その例外が伝播すること', async () => {
        // Arrange
        const validateMock = vi
          .fn()
          .mockRejectedValue(new Error('bridge exploded'));
        const { sut } = createSut(validateMock);

        // Act
        const actual = sut.execute({});

        // Assert
        await expect(actual).rejects.toThrow('bridge exploded');
      });
    });
  });
});
