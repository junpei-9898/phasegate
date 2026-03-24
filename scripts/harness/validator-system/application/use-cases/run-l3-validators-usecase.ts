/**
 * @layer application
 * @unit validator-system
 *
 * RunL3ValidatorsUseCase — H08-02: L3バリデータ実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidationResult } from '../../domain/value-objects/validation-result.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL3ValidatorsInput } from '../dto/run-l3-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';
import type { AcCoveragePolicyPort } from '../../domain/ports/ac-coverage-policy-port.js';
import type { SecurityPatternScannerPort } from '../../domain/ports/security-pattern-scanner-port.js';
import type { PerformanceScannerPort } from '../../domain/ports/performance-scanner-port.js';

export class CoverageReportNotFoundError extends Error {
  constructor(path: string) {
    super(`Coverage report not found: ${path}`);
    this.name = 'CoverageReportNotFoundError';
  }
}

export interface RunL3ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
  acCoveragePolicyPort?: AcCoveragePolicyPort;
  coverageReportPort?: { getCoverage(): Promise<{ overallCoverage: number; perFileCoverage: readonly { filePath: string; coverage: number }[] }> };
  securityScannerPort?: SecurityPatternScannerPort;
  performanceScannerPort?: PerformanceScannerPort;
}

export class RunL3ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly acCoveragePolicyPort?: AcCoveragePolicyPort;
  private readonly coverageReportPort?: RunL3ValidatorsUseCaseDeps['coverageReportPort'];
  private readonly securityScannerPort?: SecurityPatternScannerPort;
  private readonly performanceScannerPort?: PerformanceScannerPort;

  constructor(deps: RunL3ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.acCoveragePolicyPort = deps.acCoveragePolicyPort;
    this.coverageReportPort = deps.coverageReportPort;
    this.securityScannerPort = deps.securityScannerPort;
    this.performanceScannerPort = deps.performanceScannerPort;
  }

  async execute(input: RunL3ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    let validatorIds: readonly ValidatorId[];
    if (input.validatorIds && input.validatorIds.length > 0) {
      validatorIds = input.validatorIds.map((id) => ValidatorId.create(id));
    } else {
      validatorIds = this.registry.listByLayer('L3').map((d) => d.validatorId);
    }

    const definitions = this.registry.select(validatorIds);

    let layerConfig;
    try {
      layerConfig = await this.configPort.getLayerConfig('L3');
    } catch (err) {
      throw new ValidatorExecutionError(`Failed to get L3 LayerConfig: ${err instanceof Error ? err.message : String(err)}`, err);
    }

    // LayerConfig.enabled === false の場合は空を返す
    if (!layerConfig.enabled) {
      return [];
    }

    // coverageReportPort が存在する場合、カバレッジを取得して判定
    if (this.coverageReportPort) {
      const coverageData = await this.coverageReportPort.getCoverage();
      const threshold = layerConfig.getThreshold('coverageThreshold');

      // カバレッジ不足の場合は fail 結果を生成
      if (threshold !== null && coverageData.overallCoverage < threshold) {
        const deficit = threshold - coverageData.overallCoverage;

        // 他のバリデータを実行
        const otherDefs = definitions.filter((d) => d.validatorId.value !== 'L3-003');
        const otherResults = this.executionService.execute(otherDefs, [layerConfig]);
        const otherContracts = this.mapper.toContracts(otherResults);

        return [
          ...otherContracts.filter((r) => r.validatorId !== 'L3-003'),
          {
            validatorId: 'L3-003',
            passed: false,
            errors: [{ code: 'L3-003', severity: 'error', message: `カバレッジ不足: 現在値 ${coverageData.overallCoverage}%、不足 ${deficit}%` , suggestion: `テストカバレッジを ${threshold}% 以上に引き上げてください` }],
            durationMs: 0,
            skipped: false,
          },
        ];
      }
    }

    const results = this.executionService.execute(definitions, [layerConfig]);
    const overrideMap = new Map<string, ValidationResult>(results.map((result) => [result.validatorId.value, result]));

    if (this.securityScannerPort) {
      const l3001Result = overrideMap.get('L3-001');
      if (l3001Result && !l3001Result.skipped) {
        const scanResult = await this.securityScannerPort.scan(input.targetPaths);
        if (!scanResult.passed) {
          overrideMap.set('L3-001', ValidationResult.fail(ValidatorId.create('L3-001'), [...scanResult.findings], 0));
        }
      }
    }

    if (this.performanceScannerPort) {
      const l3002Result = overrideMap.get('L3-002');
      if (l3002Result && !l3002Result.skipped) {
        const bundleSizeLimit = layerConfig.getThreshold('bundleSizeLimit');
        const thresholds: Record<string, number> = bundleSizeLimit !== null ? { bundleSizeLimit } : {};
        const scanResult = await this.performanceScannerPort.scan(input.targetPaths, thresholds);
        if (!scanResult.passed) {
          overrideMap.set('L3-002', ValidationResult.fail(ValidatorId.create('L3-002'), [...scanResult.findings], 0));
        }
      }
    }

    if (this.acCoveragePolicyPort) {
      const l3004Result = overrideMap.get('L3-004');
      if (l3004Result && !l3004Result.skipped) {
        const policyResult = await this.acCoveragePolicyPort.checkCoverage({
          matrixFilePath: input.requirementMatrixPath,
        });
        if (!policyResult.passed) {
          overrideMap.set(
            'L3-004',
            ValidationResult.fail(
              ValidatorId.create('L3-004'),
              [...policyResult.errors],
              0,
            ),
          );
        }
      }
    }

    const finalResults = definitions.map(
      (definition) => overrideMap.get(definition.validatorId.value) ?? ValidationResult.skip(definition.validatorId),
    );
    return this.mapper.toContracts(finalResults);
  }
}
