/**
 * @layer application
 * @unit harness-error
 *
 * NormalizeValidatorErrorsUseCase のユニットテスト
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { CreateHarnessErrorInput } from '../../../harness-error/application/dto/create-harness-error-input.js';
import type { ValidatorIssueDraft } from '../../../harness-error/application/dto/validator-issue-draft.js';
import { HarnessErrorContractMapper } from '../../../harness-error/application/mappers/harness-error-contract-mapper.js';
import { CreateHarnessErrorUseCase } from '../../../harness-error/application/usecases/create-harness-error-use-case.js';
import { NormalizeValidatorErrorsUseCase } from '../../../harness-error/application/usecases/normalize-validator-errors-use-case.js';
import { InvalidErrorCodeError } from '../../../harness-error/domain/errors/invalid-error-code-error.js';
import { ErrorDefinitionRegistry } from '../../../harness-error/domain/services/error-definition-registry.js';
import { HarnessErrorFactory } from '../../../harness-error/domain/services/harness-error-factory.js';
import { SeverityContractEnforcer } from '../../../harness-error/domain/services/severity-contract-enforcer.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { FixExampleValidationResult } from '../../../harness-error/domain/value-objects/fix-example-validation-result.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

const createErrorCode = (value = 'L1-001') => ErrorCode.create(value);
const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);
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
    createErrorDefinition({
      code: createErrorCode('L2-010'),
      defaultSeverity: createSeverity('warning'),
      ownerValidatorId: 'dependency',
      category: 'dependency',
      title: '依存違反',
      defaultFixExample: createFixExample('const dependencyFixed = true;'),
    }),
    createErrorDefinition({
      code: createErrorCode('L4-001'),
      defaultSeverity: createSeverity('warning'),
      ownerValidatorId: 'drift-detector',
      category: 'consistency',
      title: 'ドリフト検出',
      defaultFixExample: createFixExample('const driftFixed = true;'),
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

const buildValidatorIssueDraft = (
  overrides: Partial<ValidatorIssueDraft> = {}
): ValidatorIssueDraft => ({
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
  const harnessErrorFactory = new HarnessErrorFactory({
    registry,
    severityContractEnforcer: new SeverityContractEnforcer(),
    adrExistenceCheckerPort: {
      exists: vi.fn().mockResolvedValue(true),
    },
    fixExampleValidatorPort: {
      validate: vi.fn().mockResolvedValue(createValidationSuccess()),
    },
  });
  const createHarnessErrorUseCase = new CreateHarnessErrorUseCase({
    harnessErrorFactory,
    contractMapper: new HarnessErrorContractMapper(),
  });
  const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });

  return { sut };
};

target('NormalizeValidatorErrorsUseCase.execute', () => {
  describe('複数draftを一括正規化する', () => {
    context('全draftが正常に変換できる場合', () => {
      // IT-HE-009
      it('複数のValidatorIssueDraftが全てHarnessErrorContractに変換されること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'warning', validatorId: 'dependency' }),
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L4-001', severity: 'warning', validatorId: 'drift-detector' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.errors).toHaveLength(3);
      });

      // IT-HE-010
      it('結果がcode昇順でソートされること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L4-001', severity: 'warning', validatorId: 'drift-detector' }),
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'warning', validatorId: 'dependency' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.errors.map((error) => error.code)).toEqual([
          'L1-001',
          'L2-010',
          'L4-001',
        ]);
      });

      // IT-HE-011
      it('同一code内の順序が入力順で安定ソートされること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001', message: '先頭' }),
          buildValidatorIssueDraft({ code: 'L1-001', message: '後続' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.errors.map((error) => error.message)).toEqual(['先頭', '後続']);
      });

      // IT-HE-012
      it('summaryのtotalが入力件数と一致すること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L1-002', severity: 'warning', validatorId: 'architecture' }),
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'warning', validatorId: 'dependency' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.summary.total).toBe(3);
      });

      // IT-HE-013
      it('summaryのerrorsとwarningsがseverityごとに集計されること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001', severity: 'error' }),
          buildValidatorIssueDraft({ code: 'L1-002', severity: 'warning', validatorId: 'architecture' }),
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'warning', validatorId: 'dependency' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.summary).toMatchObject({ total: 3, errors: 1, warnings: 2 });
      });

      // IT-HE-018
      it('errorとwarningが混在してもsummaryが正しく計算されること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001', severity: 'error' }),
          buildValidatorIssueDraft({ code: 'L1-002', severity: 'warning', validatorId: 'architecture' }),
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'error', validatorId: 'dependency' }),
          buildValidatorIssueDraft({ code: 'L4-001', severity: 'warning', validatorId: 'drift-detector' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.summary).toMatchObject({ total: 4, errors: 2, warnings: 2 });
      });
    });

    context('入力が空配列の場合', () => {
      // IT-HE-015
      it('空結果とゼロサマリーが返されること', async () => {
        // Arrange
        const { sut } = createSut();

        // Act
        const actual = await sut.execute([]);

        // Assert
        expect(actual).toMatchObject({
          errors: [],
          summary: { total: 0, errors: 0, warnings: 0 },
        });
      });
    });

    context('いずれかのdraft変換が失敗する場合', () => {
      // IT-HE-016
      it('1件の失敗で全体が失敗すること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'INVALID' }),
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'warning', validatorId: 'dependency' }),
        ];

        // Act
        const actual = sut.execute(drafts);

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });

      // IT-HE-017
      it('先頭が成功しても後続失敗で全体が失敗すること', async () => {
        // Arrange
        const { sut } = createSut();
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L2-PHASE-GATE' }),
        ];

        // Act
        const actual = sut.execute(drafts);

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });
    });
  });
});
