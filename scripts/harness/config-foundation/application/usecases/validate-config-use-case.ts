/**
 * @layer application
 * @unit config-foundation
 */
import { ConfigFoundationDomainError } from '../../domain/errors/config-foundation-domain-error.js';
import type { ConfigSchemaValidatorPort } from '../../domain/ports/config-schema-validator-port.js';
import {
  PresetResolutionService,
  type PresetDefinition,
} from '../../domain/services/preset-resolution-service.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';
import type { ValidateConfigResult } from '../dto/validate-config-result.js';
import {
  resolveSourceDocument,
  type PresetDefinitions,
} from './load-resolved-config-use-case.js';

export interface ValidateConfigUseCaseDependencies {
  readonly schemaValidator: ConfigSchemaValidatorPort;
  readonly presetDefinitions: Readonly<Record<'minimal' | 'standard' | 'strict', PresetDefinition>>;
  readonly presetResolutionService: PresetResolutionService;
}

function toHarnessError(error: unknown): HarnessError {
  if (error instanceof ConfigFoundationDomainError) {
    return new HarnessError({
      code: ErrorCode.create(error.errorCode),
      severity: Severity.create('error'),
      message: error.message,
      suggestion: '設定を修正してください',
      adrRef: null,
      fixExample: null,
    });
  }

  if (error instanceof Error) {
    return new HarnessError({
      code: ErrorCode.create('L1-001'),
      severity: Severity.create('error'),
      message: error.message,
      suggestion: '設定を修正してください',
      adrRef: null,
      fixExample: null,
    });
  }

  return new HarnessError({
    code: ErrorCode.create('L1-001'),
    severity: Severity.create('error'),
    message: '設定検証中に未知のエラーが発生しました',
    suggestion: '設定を修正してください',
    adrRef: null,
    fixExample: null,
  });
}

export class ValidateConfigUseCase {
  private readonly schemaValidator: ConfigSchemaValidatorPort;
  private readonly presetDefinitions: PresetDefinitions;
  private readonly presetResolutionService: PresetResolutionService;

  constructor(dependencies: ValidateConfigUseCaseDependencies) {
    this.schemaValidator = dependencies.schemaValidator;
    this.presetDefinitions = dependencies.presetDefinitions;
    this.presetResolutionService = dependencies.presetResolutionService;
  }

  execute(document: unknown): ValidateConfigResult {
    const schemaErrors = this.schemaValidator.validate(document);

    if (schemaErrors.length > 0) {
      return {
        valid: false,
        errors: schemaErrors,
      };
    }

    try {
      resolveSourceDocument(
        document as Parameters<typeof resolveSourceDocument>[0],
        this.presetDefinitions,
        this.presetResolutionService,
      );

      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [toHarnessError(error)],
      };
    }
  }
}
