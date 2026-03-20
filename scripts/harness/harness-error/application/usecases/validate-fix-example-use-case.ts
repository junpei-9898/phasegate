/**
 * @layer application
 * @unit harness-error
 *
 * 単一定義の fix_example を検証するUseCase
 */
import type { ValidateFixExampleInput } from '../dto/validate-fix-example-input.js';
import type { ValidateFixExampleOutput } from '../dto/validate-fix-example-output.js';
import { MissingFixExampleError } from '../../domain/errors/missing-fix-example-error.js';
import type { FixExampleValidatorPort } from '../../domain/ports/fix-example-validator-port.js';
import type { ErrorDefinitionRegistry } from '../../domain/services/error-definition-registry.js';
import { ErrorCode } from '../../domain/value-objects/error-code.js';
import { FixExample } from '../../domain/value-objects/fix-example.js';

export interface ValidateFixExampleUseCaseDeps {
  readonly errorDefinitionRegistry: ErrorDefinitionRegistry;
  readonly fixExampleValidator: FixExampleValidatorPort;
}

export class ValidateFixExampleUseCase {
  private readonly errorDefinitionRegistry: ErrorDefinitionRegistry;
  private readonly fixExampleValidator: FixExampleValidatorPort;

  constructor(deps: ValidateFixExampleUseCaseDeps) {
    this.errorDefinitionRegistry = deps.errorDefinitionRegistry;
    this.fixExampleValidator = deps.fixExampleValidator;
  }

  async execute(
    input: ValidateFixExampleInput
  ): Promise<Readonly<ValidateFixExampleOutput>> {
    const errorCode = ErrorCode.create(input.code);
    const definition = this.errorDefinitionRegistry.getDefinition(errorCode);
    const fixExample =
      input.overrideFixExample !== undefined
        ? FixExample.create(input.overrideFixExample)
        : definition.defaultFixExample;

    if (fixExample === null) {
      throw new MissingFixExampleError(errorCode.toString());
    }

    const validationResult = await this.fixExampleValidator.validate({
      validatorId: definition.ownerValidatorId,
      errorCode,
      fixExample,
    });

    return Object.freeze({
      code: errorCode.toString(),
      validatorId: definition.ownerValidatorId,
      passed: validationResult.passed,
      diagnostics: Object.freeze([...validationResult.diagnostics]),
    });
  }
}
