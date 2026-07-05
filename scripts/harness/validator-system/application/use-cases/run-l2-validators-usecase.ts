/**
 * @layer application
 * @unit validator-system
 *
 * RunL2ValidatorsUseCase — H08-01: L2バリデータ実行
 * @work-item-id WI-110 / WI-111 / WI-140 / WI-132 / WI-133 / WI-136 / WI-137 / WI-138
 */
import { readFile } from 'node:fs/promises';
import { ValidatorId, InvalidValidatorIdError } from '../../domain/value-objects/validator-id.js';
import { ValidationResult, type HarnessErrorLike } from '../../domain/value-objects/validation-result.js';
import type { ValidatorRegistry } from '../../domain/services/validator-registry.js';
import { type ValidatorExecutionService, ValidatorExecutionError } from '../../domain/services/validator-execution-service.js';
import type { ValidationResultContractMapper } from '../mappers/validation-result-contract-mapper.js';
import type { ValidationResultContract } from '../dto/validation-result-contract.js';
import type { RunL2ValidatorsInput } from '../dto/run-l2-validators-input.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';
import type { PhaseGatePolicyPort } from '../../domain/ports/phase-gate-policy-port.js';
import type { MetadataPolicyPort } from '../../domain/ports/metadata-policy-port.js';
import type { TestQualityAnalyzerPort } from '../../domain/ports/test-quality-analyzer-port.js';
import type { CliCommandRegistryPort } from '../../domain/ports/cli-command-registry-port.js';
import type { E2eTestFileRegistryPort } from '../../domain/ports/e2e-test-file-registry-port.js';
import { CliE2eTestExistenceService } from '../../domain/services/cli-e2e-test-existence-service.js';
import type { WorkItemStatusPolicyPort } from '../../domain/ports/work-item-status-policy-port.js';
import type { ContractTraceabilityPolicyPort } from '../../domain/ports/contract-traceability-policy-port.js';
import { ContractTraceabilityCoverageService } from '../../domain/services/contract-traceability-coverage-service.js';

export interface RunL2ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
  phaseGatePolicyPort?: PhaseGatePolicyPort;
  metadataPolicyPort?: MetadataPolicyPort;
  testQualityAnalyzerPort?: TestQualityAnalyzerPort;
  cliCommandRegistryPort?: CliCommandRegistryPort;
  e2eTestFileRegistryPort?: E2eTestFileRegistryPort;
  workItemStatusPolicyPort?: WorkItemStatusPolicyPort;
  contractTraceabilityPolicyPort?: ContractTraceabilityPolicyPort;
}

export class RunL2ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly phaseGatePolicyPort?: PhaseGatePolicyPort;
  private readonly metadataPolicyPort?: MetadataPolicyPort;
  private readonly testQualityAnalyzerPort?: TestQualityAnalyzerPort;
  private readonly cliCommandRegistryPort?: CliCommandRegistryPort;
  private readonly e2eTestFileRegistryPort?: E2eTestFileRegistryPort;
  private readonly workItemStatusPolicyPort?: WorkItemStatusPolicyPort;
  private readonly contractTraceabilityPolicyPort?: ContractTraceabilityPolicyPort;
  private readonly cliE2eTestExistenceService = new CliE2eTestExistenceService();
  private readonly contractTraceabilityCoverageService = new ContractTraceabilityCoverageService();

  constructor(deps: RunL2ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.phaseGatePolicyPort = deps.phaseGatePolicyPort;
    this.metadataPolicyPort = deps.metadataPolicyPort;
    this.testQualityAnalyzerPort = deps.testQualityAnalyzerPort;
    this.cliCommandRegistryPort = deps.cliCommandRegistryPort;
    this.e2eTestFileRegistryPort = deps.e2eTestFileRegistryPort;
    this.workItemStatusPolicyPort = deps.workItemStatusPolicyPort;
    this.contractTraceabilityPolicyPort = deps.contractTraceabilityPolicyPort;
  }

  async execute(input: RunL2ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    // バリデータID解決
    let validatorIds: readonly ValidatorId[];
    if (input.validatorIds && input.validatorIds.length > 0) {
      validatorIds = input.validatorIds.map((id) => ValidatorId.create(id));
    } else {
      validatorIds = this.registry.listByLayer('L2').map((d) => d.validatorId);
    }

    const definitions = this.registry.select(validatorIds);

    // LayerConfig取得
    let layerConfig;
    try {
      layerConfig = await this.configPort.getLayerConfig('L2');
    } catch (err) {
      throw new ValidatorExecutionError(`Failed to get L2 LayerConfig: ${err instanceof Error ? err.message : String(err)}`, err);
    }

    const results = this.executionService.execute(definitions, [layerConfig]);
    const overrideMap = new Map<string, ValidationResult>(results.map((result) => [result.validatorId.value, result]));

    if (this.phaseGatePolicyPort) {
      const l2001Result = overrideMap.get('L2-001');
      if (l2001Result && !l2001Result.skipped) {
        const policyResult = await this.phaseGatePolicyPort.checkPrerequisites({
          unitName: input.unitName,
          currentPhase: input.currentPhase,
        });
        if (!policyResult.satisfied) {
          overrideMap.set(
            'L2-001',
            ValidationResult.fail(
              ValidatorId.create('L2-001'),
              [...policyResult.violations],
              0,
            ),
          );
        }
      }
    }

    if (this.metadataPolicyPort) {
      const l2002Result = overrideMap.get('L2-002');
      if (l2002Result && !l2002Result.skipped) {
        const allErrors: HarnessErrorLike[] = [];
        for (const filePath of input.targetPaths) {
          try {
            const fileContent = await readFile(filePath, 'utf-8');
            const policyResult = await this.metadataPolicyPort.validateMetadata({ filePath, fileContent });
            if (!policyResult.passed) {
              allErrors.push(...policyResult.errors);
            }
          } catch {
            // skip unreadable files
          }
        }
        if (allErrors.length > 0) {
          overrideMap.set('L2-002', ValidationResult.fail(ValidatorId.create('L2-002'), allErrors, 0));
        }
      }
    }

    if (this.testQualityAnalyzerPort) {
      const l2003Result = overrideMap.get('L2-003');
      if (l2003Result && !l2003Result.skipped) {
        const analysisResult = await this.testQualityAnalyzerPort.analyzeTestFiles(input.targetPaths);
        const allViolations: HarnessErrorLike[] = analysisResult.results
          .filter((r) => !r.passed)
          .flatMap((r) => [...r.violations]);
        if (allViolations.length > 0) {
          overrideMap.set('L2-003', ValidationResult.fail(ValidatorId.create('L2-003'), allViolations, 0));
        }
      }
    }

    if (this.cliCommandRegistryPort && this.e2eTestFileRegistryPort) {
      const l2013Result = overrideMap.get('L2-013');
      if (l2013Result && !l2013Result.skipped) {
        const commands = await this.cliCommandRegistryPort.getRegisteredCommands();
        const e2eFiles = await this.e2eTestFileRegistryPort.getE2eTestFiles();
        const report = this.cliE2eTestExistenceService.check(commands, e2eFiles);
        if (report.hasViolations()) {
          const errors = report.toMessages().map((msg) => ({
            code: { value: 'L2-013', toString: () => 'L2-013' },
            severity: { value: 'error', toString: () => 'error' },
            message: msg,
            suggestion: 'Add an E2E test for each registered CLI command in cli-harness.test.ts.',
          }));
          overrideMap.set('L2-013', ValidationResult.fail(ValidatorId.create('L2-013'), errors, 0));
        } else {
          overrideMap.set('L2-013', ValidationResult.pass(ValidatorId.create('L2-013'), 0));
        }
      }
    }

    if (this.workItemStatusPolicyPort) {
      const l2014Result = overrideMap.get('L2-014');
      if (l2014Result && !l2014Result.skipped) {
        const staleReports = await this.workItemStatusPolicyPort.findStaleReports(input.targetPaths);
        if (staleReports.length > 0) {
          const errors = staleReports.map((report) => ({
            code: { value: 'L2-014', toString: () => 'L2-014' },
            severity: { value: 'error', toString: () => 'error' },
            message: `${report.id} status is stale: current=${report.currentStatus}, derived=${report.derivedStatus}`,
            suggestion: report.nextAction,
            workItemId: report.id,
            descriptionPath: report.descriptionPath,
            currentStatus: report.currentStatus,
            derivedStatus: report.derivedStatus,
            evidence: report.evidence,
          }));
          overrideMap.set('L2-014', ValidationResult.fail(ValidatorId.create('L2-014'), errors, 0));
        } else {
          overrideMap.set('L2-014', ValidationResult.pass(ValidatorId.create('L2-014'), 0));
        }
      }
    }

    if (this.contractTraceabilityPolicyPort) {
      const l2015Result = overrideMap.get('L2-015');
      if (l2015Result && !l2015Result.skipped) {
        const inputModel = await this.contractTraceabilityPolicyPort.collect(input.targetPaths);
        const report = this.contractTraceabilityCoverageService.check(inputModel);
        if (report.hasFindings()) {
          const errors = report.findings.map((finding) => ({
            code: { value: 'L2-015', toString: () => 'L2-015' },
            severity: { value: finding.severity, toString: () => finding.severity },
            message: finding.message,
            suggestion: finding.suggestion,
            kind: finding.kind,
            subject: finding.subject,
            sourcePath: finding.sourcePath,
          }));
          overrideMap.set('L2-015', ValidationResult.fail(ValidatorId.create('L2-015'), errors, 0));
        } else {
          overrideMap.set('L2-015', ValidationResult.pass(ValidatorId.create('L2-015'), 0));
        }
      }
    }

    const finalResults = definitions.map(
      (definition) => overrideMap.get(definition.validatorId.value) ?? ValidationResult.skip(definition.validatorId),
    );
    return this.mapper.toContracts(finalResults);
  }
}
