/**
 * @layer application
 * @unit validator-system
 *
 * RunL1ValidatorsUseCase — H08-07/H08-08: L1バリデータ実行
 * L1-017 ITテスト内部モック検出、L1-018 スタブコメント残存検出を実行する。
 * @work-item-id WI-110
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidationResult } from '../../domain/value-objects/validation-result.js';
import { ItTestMockDetectionService } from '../../domain/services/it-test-mock-detection-service.js';
import { StubCommentDetectionService } from '../../domain/services/stub-comment-detection-service.js';
import type { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL1ValidatorsInput } from '../dto/run-l1-validators-input.js';
import type { ItTestFileAnalyzerPort } from '../../domain/ports/it-test-file-analyzer-port.js';
import type { SourceFileTextScannerPort } from '../../domain/ports/source-file-text-scanner-port.js';

export interface RunL1ValidatorsUseCaseDeps {
  itTestFileAnalyzerPort: ItTestFileAnalyzerPort;
  sourceFileTextScannerPort: SourceFileTextScannerPort;
  contractMapper: ValidationResultContractMapper;
}

export class RunL1ValidatorsUseCase {
  private readonly itTestFileAnalyzerPort: ItTestFileAnalyzerPort;
  private readonly sourceFileTextScannerPort: SourceFileTextScannerPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly itTestMockDetectionService = new ItTestMockDetectionService();
  private readonly stubCommentDetectionService = new StubCommentDetectionService();

  constructor(deps: RunL1ValidatorsUseCaseDeps) {
    this.itTestFileAnalyzerPort = deps.itTestFileAnalyzerPort;
    this.sourceFileTextScannerPort = deps.sourceFileTextScannerPort;
    this.mapper = deps.contractMapper;
  }

  async execute(input: RunL1ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    const results: ValidationResult[] = [];

    results.push(await this.runL1017(input));
    results.push(await this.runL1018(input));

    return this.mapper.toContracts(results);
  }

  /** H08-07: L1-017 ITテスト内部モック検出 */
  private async runL1017(input: RunL1ValidatorsInput): Promise<ValidationResult> {
    const validatorId = ValidatorId.create('L1-017');
    const start = Date.now();
    try {
      const mockCalls = await this.itTestFileAnalyzerPort.findMockCallsInItTests(input.targetPaths);
      const report = this.itTestMockDetectionService.detect(mockCalls);
      const durationMs = Date.now() - start;
      if (report.hasViolations()) {
        const errors = report.toMessages().map((msg) => ({
          code: { value: 'L1-017', toString: () => 'L1-017' },
          severity: { value: 'error', toString: () => 'error' },
          message: msg,
          suggestion: 'IT tests should use real implementations. Remove vi.mock() on internal modules.',
        }));
        return ValidationResult.fail(validatorId, errors, durationMs);
      }
      return ValidationResult.pass(validatorId, durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      return ValidationResult.fail(validatorId, [{
        code: { value: 'L1-017', toString: () => 'L1-017' },
        severity: { value: 'error', toString: () => 'error' },
        message: `L1-017 execution failed: ${err instanceof Error ? err.message : String(err)}`,
        suggestion: '',
      }], durationMs);
    }
  }

  /** H08-08: L1-018 スタブコメント残存検出 */
  private async runL1018(input: RunL1ValidatorsInput): Promise<ValidationResult> {
    const validatorId = ValidatorId.create('L1-018');
    const start = Date.now();
    try {
      const matches = await this.sourceFileTextScannerPort.scanForPattern(
        StubCommentDetectionService.STUB_COMMENT_PATTERN,
        input.targetPaths,
      );
      const report = this.stubCommentDetectionService.detect(matches);
      const durationMs = Date.now() - start;
      if (report.hasViolations()) {
        const errors = report.toMessages().map((msg) => ({
          code: { value: 'L1-018', toString: () => 'L1-018' },
          severity: { value: 'error', toString: () => 'error' },
          message: msg,
          suggestion: 'Replace stub implementations with real logic before merging.',
        }));
        return ValidationResult.fail(validatorId, errors, durationMs);
      }
      return ValidationResult.pass(validatorId, durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      return ValidationResult.fail(validatorId, [{
        code: { value: 'L1-018', toString: () => 'L1-018' },
        severity: { value: 'error', toString: () => 'error' },
        message: `L1-018 execution failed: ${err instanceof Error ? err.message : String(err)}`,
        suggestion: '',
      }], durationMs);
    }
  }

}

// @story-id H08-07
