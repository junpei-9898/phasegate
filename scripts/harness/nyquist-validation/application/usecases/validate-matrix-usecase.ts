/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-01: requirement-test-matrix.json のスキーマ＋整合性バリデーション
 */
import type { MatrixFilePort } from '../../domain/ports/matrix-file-port.js';
import type { NyquistHarnessError } from '../../domain/services/ac-coverage-gate-policy.js';
import type { MatrixValidationService } from '../../domain/services/matrix-validation-service.js';
import type { ValidateMatrixInput } from '../dto/validate-matrix-input.js';
import type { ValidateMatrixOutput } from '../dto/validate-matrix-output.js';

export interface AjvValidatorPort {
  validate(data: unknown): Promise<{ valid: boolean; errors: NyquistHarnessError[] }>;
}

export interface ValidateMatrixUseCaseDeps {
  readonly matrixFilePort: MatrixFilePort;
  readonly ajvValidator: AjvValidatorPort;
  readonly matrixValidationService: MatrixValidationService;
}

export class ValidateMatrixUseCase {
  private readonly matrixFilePort: MatrixFilePort;
  private readonly ajvValidator: AjvValidatorPort;
  private readonly matrixValidationService: MatrixValidationService;

  constructor(deps: ValidateMatrixUseCaseDeps) {
    this.matrixFilePort = deps.matrixFilePort;
    this.ajvValidator = deps.ajvValidator;
    this.matrixValidationService = deps.matrixValidationService;
  }

  async execute(input: ValidateMatrixInput): Promise<ValidateMatrixOutput> {
    const rawData = await this.matrixFilePort.read(input.matrixFilePath);

    // JSONスキーマバリデーション
    const schemaResult = await this.ajvValidator.validate(rawData);
    const schemaErrors: NyquistHarnessError[] = schemaResult.valid ? [] : [...schemaResult.errors];

    // failFast: スキーマエラーがある場合は即時返却
    if (input.failFast === true && schemaErrors.length > 0) {
      return {
        passed: false,
        errors: schemaErrors,
        schemaErrors,
        integrityErrors: [],
        validatedData: null,
      };
    }

    // storyId整合性チェック
    const integrityResult = await this.matrixValidationService.validate(rawData);
    const integrityErrors: NyquistHarnessError[] = integrityResult.passed
      ? []
      : [...integrityResult.errors];

    const errors = [...schemaErrors, ...integrityErrors];
    const passed = errors.length === 0;

    return {
      passed,
      errors,
      schemaErrors,
      integrityErrors,
      validatedData: passed ? rawData : null,
    };
  }
}
