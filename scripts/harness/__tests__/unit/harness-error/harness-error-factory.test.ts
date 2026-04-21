/**
 * @layer domain
 * @unit harness-error
 *
 * HarnessErrorFactory ドメインサービスのユニットテスト
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { FixExampleValidationResult } from '../../../harness-error/domain/value-objects/fix-example-validation-result.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import type { ErrorDefinitionProps } from '../../../harness-error/domain/value-objects/error-definition.js';
import { ErrorDefinitionRegistry } from '../../../harness-error/domain/services/error-definition-registry.js';
import { SeverityContractEnforcer } from '../../../harness-error/domain/services/severity-contract-enforcer.js';
import { HarnessErrorFactory } from '../../../harness-error/domain/services/harness-error-factory.js';
import type { CreateHarnessErrorParams } from '../../../harness-error/domain/services/harness-error-factory.js';
import { UnknownErrorDefinitionError } from '../../../harness-error/domain/errors/unknown-error-definition-error.js';
import { SeverityDowngradeViolationError } from '../../../harness-error/domain/errors/severity-downgrade-violation-error.js';
import { MissingAdrRefError } from '../../../harness-error/domain/errors/missing-adr-ref-error.js';
import { AdrReferenceNotFoundError } from '../../../harness-error/domain/errors/adr-reference-not-found-error.js';
import { MissingFixExampleError } from '../../../harness-error/domain/errors/missing-fix-example-error.js';
import { InvalidFixExampleError } from '../../../harness-error/domain/errors/invalid-fix-example-error.js';
import { EmptyMessageError } from '../../../harness-error/domain/errors/empty-message-error.js';
import { EmptySuggestionError } from '../../../harness-error/domain/errors/empty-suggestion-error.js';
import { InvalidErrorCodeError } from '../../../harness-error/domain/errors/invalid-error-code-error.js';

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
    category: 'phase_gate',
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

const createRegistry = (definitions: ErrorDefinition[] = []) =>
  new ErrorDefinitionRegistry(definitions);

const createFactory = (params?: {
  definitions?: ErrorDefinition[];
  adrExists?: boolean;
  validationResult?: FixExampleValidationResult;
}) => {
  const registry = createRegistry(params?.definitions ?? []);
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

const createFactoryParams = (overrides: Partial<CreateHarnessErrorParams> = {}): CreateHarnessErrorParams => ({
  code: 'L1-001',
  requestedSeverity: undefined,
  message: '違反を検出しました',
  suggestion: '設計書を確認してください',
  adrRef: 'ADR-010',
  fixExample: 'const fixedValue = 1;',
  validatorId: 'phase-gate',
  ...overrides,
});

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
        await expect(actual()).rejects.toThrowError(UnknownErrorDefinitionError);
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
        await expect(actual()).rejects.toThrowError(SeverityDowngradeViolationError);
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
        await expect(actual()).rejects.toThrowError(MissingAdrRefError);
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
        await expect(actual()).rejects.toThrowError(AdrReferenceNotFoundError);
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
        await expect(actual()).rejects.toThrowError(MissingFixExampleError);
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
        await expect(actual()).rejects.toThrowError(InvalidFixExampleError);
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
        await expect(actual()).rejects.toThrowError(EmptyMessageError);
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
        await expect(actual()).rejects.toThrowError(EmptySuggestionError);
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
        await expect(actual()).rejects.toThrowError();
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
        await expect(actual()).rejects.toThrowError(InvalidFixExampleError);
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
        await expect(actual()).rejects.toThrowError(AdrReferenceNotFoundError);
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
        await expect(actual()).rejects.toThrowError(InvalidErrorCodeError);
      });
    });

    // ISSUE-007 Wave 3 / H12-03: actionable fields propagation
    describe('actionable default fields を ErrorDefinition から継承する', () => {
      // UT-HE-079
      it('ErrorDefinition の defaultSuggestedSkill / defaultScaffoldCommand / defaultTemplatePath が HarnessError に伝播すること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L2-001'),
          defaultSuggestedSkill: '/story-implementor',
          defaultScaffoldCommand: 'npx phasegate scaffold-design --unit x --phase logical',
          defaultTemplatePath: 'docs/templates/logical_design.template.md',
        });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({ code: 'L2-001', adrRef: null, fixExample: null });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.suggestedSkill).toBe('/story-implementor');
        expect(actual.scaffoldCommand).toBe('npx phasegate scaffold-design --unit x --phase logical');
        expect(actual.templatePath).toBe('docs/templates/logical_design.template.md');
      });

      // UT-HE-080
      it('CreateHarnessErrorParams の明示引数が ErrorDefinition の default を上書きすること', async () => {
        // Arrange
        const definition = createErrorDefinition({
          code: createErrorCode('L2-001'),
          defaultSuggestedSkill: '/story-implementor',
          defaultScaffoldCommand: 'default-command',
          defaultTemplatePath: 'default-path',
        });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({
          code: 'L2-001',
          adrRef: null,
          fixExample: null,
          suggestedSkill: '/logical-designer',
          scaffoldCommand: 'explicit-command',
          templatePath: 'explicit-path',
        });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.suggestedSkill).toBe('/logical-designer');
        expect(actual.scaffoldCommand).toBe('explicit-command');
        expect(actual.templatePath).toBe('explicit-path');
      });

      // UT-HE-081
      it('ErrorDefinition に default が無く input にも無い場合 HarnessError の 3 フィールドは null', async () => {
        // Arrange
        const definition = createErrorDefinition({ code: createErrorCode('L2-001') });
        const { sut } = createFactory({ definitions: [definition] });
        const params = createFactoryParams({ code: 'L2-001', adrRef: null, fixExample: null });

        // Act
        const actual = await sut.create(params);

        // Assert
        expect(actual.suggestedSkill).toBeNull();
        expect(actual.scaffoldCommand).toBeNull();
        expect(actual.templatePath).toBeNull();
      });
    });
  });
});
