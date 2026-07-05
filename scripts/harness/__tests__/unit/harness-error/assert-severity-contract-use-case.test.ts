/**
 * @layer application
 * @unit harness-error
 * @story H06-03
 *
 * AssertSeverityContractUseCase のユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { SeverityContractCheckInput } from '../../../harness-error/application/dto/severity-contract-check-input.js';
import { AssertSeverityContractUseCase } from '../../../harness-error/application/usecases/assert-severity-contract-use-case.js';
import { InvalidErrorCodeError } from '../../../harness-error/domain/errors/invalid-error-code-error.js';
import { SeverityDowngradeViolationError } from '../../../harness-error/domain/errors/severity-downgrade-violation-error.js';
import { UnknownErrorDefinitionError } from '../../../harness-error/domain/errors/unknown-error-definition-error.js';
import { ErrorDefinitionRegistry } from '../../../harness-error/domain/services/error-definition-registry.js';
import { SeverityContractEnforcer } from '../../../harness-error/domain/services/severity-contract-enforcer.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
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
      defaultSeverity: createSeverity('error'),
      ownerValidatorId: 'phase-gate',
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

const buildSeverityContractCheckInput = (
  overrides: Partial<SeverityContractCheckInput> = {}
): SeverityContractCheckInput => ({
  code: 'L1-001',
  requestedSeverity: 'error',
  ...overrides,
});

target('AssertSeverityContractUseCase.execute', () => {
  describe('severity契約を検証する', () => {
    context('格上げまたは同値要求の場合', () => {
      // IT-HE-035
      it('格上げが許容されeffectiveSeverityがerrorで返されること', async () => {
        // Arrange
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: createRegistry(),
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = await sut.execute(
          buildSeverityContractCheckInput({
            code: 'L1-002',
            requestedSeverity: 'error',
          })
        );

        // Assert
        expect(actual.effectiveSeverity).toBe('error');
      });

      // IT-HE-036
      it('同一severityが許容されること', async () => {
        // Arrange
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: createRegistry(),
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = await sut.execute(buildSeverityContractCheckInput());

        // Assert
        expect(actual).toMatchObject({
          effectiveSeverity: 'error',
          violated: false,
        });
      });

      // IT-HE-037
      it('violated=falseが返されること', async () => {
        // Arrange
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: createRegistry(),
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = await sut.execute(buildSeverityContractCheckInput());

        // Assert
        expect(actual.violated).toBe(false);
      });
    });

    context('格下げ要求の場合', () => {
      // IT-HE-038
      // @ac H06-03-3
      // H06-03 AC-3: severity 格下げ（error→warning）を試みるケースを検出するテストが
      // 存在することを検証する。格下げ要求時に SeverityDowngradeViolationError が throw される。
      it('SeverityDowngradeViolationErrorをthrowすること', async () => {
        // Arrange
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: createRegistry(),
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = sut.execute(
          buildSeverityContractCheckInput({ requestedSeverity: 'warning' })
        );

        // Assert
        await expect(actual).rejects.toThrow(SeverityDowngradeViolationError);
      });
    });

    context('定義を取得できない場合', () => {
      // IT-HE-039
      it('UnknownErrorDefinitionErrorをthrowすること', async () => {
        // Arrange
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: createRegistry(),
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = sut.execute(
          buildSeverityContractCheckInput({ code: 'L1-999' })
        );

        // Assert
        await expect(actual).rejects.toThrow(UnknownErrorDefinitionError);
      });
    });

    context('code形式が不正な場合', () => {
      // IT-HE-040
      it('InvalidErrorCodeErrorをthrowすること', async () => {
        // Arrange
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: createRegistry(),
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = sut.execute(
          buildSeverityContractCheckInput({ code: 'L2-PHASE-GATE' })
        );

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });
    });
  });
});
