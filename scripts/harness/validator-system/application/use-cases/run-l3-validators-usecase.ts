/**
 * @layer application
 * @unit validator-system
 *
 * RunL3ValidatorsUseCase — H08-02: L3バリデータ実行
 */
import { ValidatorId } from '../../domain/value-objects/validator-id.js';
import { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL3ValidatorsInput } from '../dto/run-l3-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';

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
  coverageReportPort?: { getCoverage(): Promise<{ overallCoverage: number; perFileCoverage: readonly { filePath: string; coverage: number }[] }> };
}

export class RunL3ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly coverageReportPort?: RunL3ValidatorsUseCaseDeps['coverageReportPort'];

  constructor(deps: RunL3ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.coverageReportPort = deps.coverageReportPort;
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
        const l3003Id = ValidatorId.create('L3-003');
        const deficit = threshold - coverageData.overallCoverage;
        const { HarnessErrorLike: _, ...__ } = { HarnessErrorLike: null };
        const errors = [{
          code: { value: 'L3-003', toString: () => 'L3-003' },
          severity: { value: 'error', toString: () => 'error' },
          message: `カバレッジ不足: 現在値 ${coverageData.overallCoverage}%、不足 ${deficit}%、必要値 ${threshold}%`,
          suggestion: `テストカバレッジを ${threshold}% 以上に引き上げてください`,
        }];
        const failResult = {
          validatorId: '    L3-003',
          passed: false,
          errors: [{ code: 'L3-003', severity: 'error', message: `カバレッジ不足: 現在値 ${coverageData.overallCoverage}%、不足 ${deficit}%`, suggestion: `テストカバレッジを ${threshold}% 以上に引き上げてください` }],
          durationMs: 0,
          skipped: false,
        };

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
    return this.mapper.toContracts(results);
  }
}
