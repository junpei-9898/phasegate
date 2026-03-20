/**
 * @layer application
 * @unit harness-error
 *
 * ValidateFixExampleUseCase のユニットテスト
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { ValidateFixExampleInput } from '../../../harness-error/application/dto/validate-fix-example-input.js';
import { ValidateFixExampleUseCase } from '../../../harness-error/application/usecases/validate-fix-example-use-case.js';
import { MissingFixExampleError } from '../../../harness-error/domain/errors/missing-fix-example-error.js';
import { UnknownErrorDefinitionError } from '../../../harness-error/domain/errors/unknown-error-definition-error.js';
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
      code: createErrorCode('L3-001'),
      ownerValidatorId: 'metadata',
      category: 'metadata',
      title: 'メタデータ違反',
      defaultFixExample: null,
      fixExampleRequired: false,
    }),
  ]);

const buildValidateFixExampleInput = (
  overrides: Partial<ValidateFixExampleInput> = {}
): ValidateFixExampleInput => ({
  code: 'L1-001',
  overrideFixExample: undefined,
  ...overrides,
});

target('ValidateFixExampleUseCase.execute', () => {
  describe('単一定義のfix_exampleを検証する', () => {
    context('overrideFixExampleが指定される場合', () => {
      // IT-HE-019
      it('overrideFixExampleを使って検証されること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = {
          validate: vi
            .fn()
            .mockResolvedValue(FixExampleValidationResult.success('phase-gate')),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = await sut.execute(
          buildValidateFixExampleInput({
            overrideFixExample: 'const overrideFix = true;',
          })
        );

        // Assert
        expect(fixExampleValidator.validate).toHaveBeenCalledWith(
          expect.objectContaining({
            validatorId: 'phase-gate',
            fixExample: expect.objectContaining({
              value: 'const overrideFix = true;',
            }),
          })
        );
        expect(actual.code).toBe('L1-001');
      });
    });

    context('overrideFixExampleが指定されない場合', () => {
      // IT-HE-020
      it('defaultFixExampleが使用されること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = {
          validate: vi
            .fn()
            .mockResolvedValue(FixExampleValidationResult.success('phase-gate')),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = await sut.execute(buildValidateFixExampleInput());

        // Assert
        expect(fixExampleValidator.validate).toHaveBeenCalledWith(
          expect.objectContaining({
            fixExample: expect.objectContaining({
              value: 'const phaseGateFixed = true;',
            }),
          })
        );
        expect(actual.code).toBe('L1-001');
      });
    });

    context('validator検証が成功する場合', () => {
      // IT-HE-021
      it('passed=trueの出力が返されること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = {
          validate: vi
            .fn()
            .mockResolvedValue(FixExampleValidationResult.success('phase-gate')),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = await sut.execute(buildValidateFixExampleInput());

        // Assert
        expect(actual.passed).toBe(true);
      });
    });

    context('validator検証が失敗する場合', () => {
      // IT-HE-022
      it('passed=falseとdiagnosticsが返されること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = {
          validate: vi.fn().mockResolvedValue(
            FixExampleValidationResult.failure(
              'phase-gate',
              'still failing',
              ['still failing']
            )
          ),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = await sut.execute(buildValidateFixExampleInput());

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.diagnostics).toEqual(['still failing']);
      });
    });

    context('出力へ定義メタデータを投影する場合', () => {
      // IT-HE-023
      it('validatorIdが定義のownerValidatorIdと一致すること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = {
          validate: vi
            .fn()
            .mockResolvedValue(FixExampleValidationResult.success('phase-gate')),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = await sut.execute(buildValidateFixExampleInput());

        // Assert
        expect(actual.validatorId).toBe('phase-gate');
      });
    });

    context('codeが未登録の場合', () => {
      // IT-HE-024
      it('UnknownErrorDefinitionErrorをthrowすること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = { validate: vi.fn() };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = sut.execute(
          buildValidateFixExampleInput({ code: 'L1-999' })
        );

        // Assert
        await expect(actual).rejects.toThrow(UnknownErrorDefinitionError);
      });
    });

    context('fix_exampleを解決できない場合', () => {
      // IT-HE-025
      it('MissingFixExampleErrorをthrowすること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = { validate: vi.fn() };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = sut.execute(
          buildValidateFixExampleInput({ code: 'L3-001' })
        );

        // Assert
        await expect(actual).rejects.toThrow(MissingFixExampleError);
      });
    });

    context('Port実行自体が失敗する場合', () => {
      // IT-HE-026
      it('FixExampleValidatorPortの実行エラーが伝播すること', async () => {
        // Arrange
        const registry = createRegistry();
        const fixExampleValidator = {
          validate: vi.fn().mockRejectedValue(new Error('validator crashed')),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator,
        });

        // Act
        const actual = sut.execute(buildValidateFixExampleInput());

        // Assert
        await expect(actual).rejects.toThrow('validator crashed');
      });
    });
  });
});
