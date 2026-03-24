/**
 * @layer application
 * @unit validator-system
 *
 * RunL1ValidatorsUseCase — H08-07/H08-08: L1バリデータ実行
 * L1-017 ITテスト内部モック検出、L1-018 スタブコメント残存検出を実行する。
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidationResult } from '../../domain/value-objects/validation-result.js';
import { ItTestMockDetectionService } from '../../domain/services/it-test-mock-detection-service.js';
import { StubCommentDetectionService } from '../../domain/services/stub-comment-detection-service.js';
import { CliE2eTestExistenceService } from '../../domain/services/cli-e2e-test-existence-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL1ValidatorsInput } from '../dto/run-l1-validators-input.js';
import type { ItTestFileAnalyzerPort } from '../../domain/ports/it-test-file-analyzer-port.js';
import type { SourceFileTextScannerPort } from '../../domain/ports/source-file-text-scanner-port.js';
import type { CliCommandRegistryPort } from '../../domain/ports/cli-command-registry-port.js';
import type { E2eTestFileRegistryPort } from '../../domain/ports/e2e-test-file-registry-port.js';

export interface RunL1ValidatorsUseCaseDeps {
  itTestFileAnalyzerPort: ItTestFileAnalyzerPort;
  sourceFileTextScannerPort: SourceFileTextScannerPort;
  cliCommandRegistryPort?: CliCommandRegistryPort;
  e2eTestFileRegistryPort?: E2eTestFileRegistryPort;
  contractMapper: ValidationResultContractMapper;
}

export class RunL1ValidatorsUseCase {
  private readonly itTestFileAnalyzerPort: ItTestFileAnalyzerPort;
  private readonly sourceFileTextScannerPort: SourceFileTextScannerPort;
  private readonly cliCommandRegistryPort: CliCommandRegistryPort | undefined;
  private readonly e2eTestFileRegistryPort: E2eTestFileRegistryPort | undefined;
  private readonly mapper: ValidationResultContractMapper;
  private readonly itTestMockDetectionService = new ItTestMockDetectionService();
  private readonly stubCommentDetectionService = new StubCommentDetectionService();
  private readonly cliE2eTestExistenceService = new CliE2eTestExistenceService();

  constructor(deps: RunL1ValidatorsUseCaseDeps) {
    this.itTestFileAnalyzerPort = deps.itTestFileAnalyzerPort;
    this.sourceFileTextScannerPort = deps.sourceFileTextScannerPort;
    this.cliCommandRegistryPort = deps.cliCommandRegistryPort;
    this.e2eTestFileRegistryPort = deps.e2eTestFileRegistryPort;
    this.mapper = deps.contractMapper;
  }

  async execute(input: RunL1ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    const results: ValidationResult[] = [];

    results.push(await this.runL1017(input));
    results.push(await this.runL1018(input));
    results.push(await this.runL2013());

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

  /** H08-09: L2-013 CLIコマンドE2Eテスト存在チェック (Should) */
  private async runL2013(): Promise<ValidationResult> {
    const validatorId = ValidatorId.create('L2-013');
    if (!this.cliCommandRegistryPort || !this.e2eTestFileRegistryPort) {
      return ValidationResult.skip(validatorId);
    }
    const start = Date.now();
    try {
      const commands = await this.cliCommandRegistryPort.getRegisteredCommands();
      const e2eFiles = await this.e2eTestFileRegistryPort.getE2eTestFiles();
      const report = this.cliE2eTestExistenceService.check(commands, e2eFiles);
      const durationMs = Date.now() - start;
      if (report.hasViolations()) {
        const errors = report.toMessages().map((msg) => ({
          code: { value: 'L2-013', toString: () => 'L2-013' },
          severity: { value: 'error', toString: () => 'error' },
          message: msg,
          suggestion: 'Add an E2E test for each registered CLI command in cli-harness.test.ts.',
        }));
        return ValidationResult.fail(validatorId, errors, durationMs);
      }
      return ValidationResult.pass(validatorId, durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      return ValidationResult.fail(validatorId, [{
        code: { value: 'L2-013', toString: () => 'L2-013' },
        severity: { value: 'error', toString: () => 'error' },
        message: `L2-013 execution failed: ${err instanceof Error ? err.message : String(err)}`,
        suggestion: '',
      }], durationMs);
    }
  }
}

// @story-id H08-07