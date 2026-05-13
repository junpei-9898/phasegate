/**
 * @layer test
 * @unit validator-system
 *
 * IT テスト共通ヘルパー・ファクトリ
 */
import { vi } from 'vitest';
import { LayerConfig } from '../../../validator-system/domain/value-objects/layer-config.js';
import type { ValidationResultContract } from '../../../validator-system/application/dto/validation-result-contract.js';
import type { AggregatedValidationReport } from '../../../validator-system/application/dto/aggregated-validation-report.js';
import { ValidatorRegistry } from '../../../validator-system/domain/services/validator-registry.js';
import { ValidatorDefinition } from '../../../validator-system/domain/value-objects/validator-definition.js';
import { ValidatorId } from '../../../validator-system/domain/value-objects/validator-id.js';
import { ValidationRule } from '../../../validator-system/domain/value-objects/validation-rule.js';
import { ValidatorExecutionService } from '../../../validator-system/domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../../../validator-system/application/mappers/validation-result-contract-mapper.js';

export function createLayerConfig(layer: 'L2' | 'L3' | 'L4', overrides: Partial<{
  enabled: boolean;
  validatorIds: string[];
  thresholds: Record<string, number>;
  strictOnly: boolean;
  preset: 'minimal' | 'standard' | 'strict';
}> = {}): LayerConfig {
  const defaultValidatorIds: Record<string, string[]> = {
    L2: ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015'],
    L3: ['L3-001', 'L3-002', 'L3-003', 'L3-004'],
    L4: ['L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005', 'L4-006'],
  };
  const defaultThresholds: Record<string, Record<string, number>> = {
    L2: {},
    L3: { coverageThreshold: 90, bundleSizeLimit: 512000 },
    L4: {},
  };

  return LayerConfig.create({
    layer,
    enabled: overrides.enabled !== undefined ? overrides.enabled : true,
    validatorIds: overrides.validatorIds ?? defaultValidatorIds[layer],
    thresholds: overrides.thresholds ?? defaultThresholds[layer],
    strictOnly: overrides.strictOnly ?? false,
    preset: overrides.preset ?? 'standard',
  });
}

export function createValidationResultContract(overrides: Partial<ValidationResultContract> = {}): ValidationResultContract {
  return {
    validatorId: 'L2-001',
    passed: true,
    errors: [],
    durationMs: 10,
    skipped: false,
    ...overrides,
  };
}

export function createAggregatedReport(overrides: Partial<AggregatedValidationReport> = {}): AggregatedValidationReport {
  return {
    overallPassed: true,
    totalValidators: 3,
    passedValidators: 3,
    failedValidators: 0,
    skippedValidators: 0,
    allErrors: [],
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      errorsByLayer: { L2: 0, L3: 0, L4: 0 },
    },
    results: [],
    ...overrides,
  };
}

/** IT テスト用フルレジストリ生成 */
export function createFullRegistry(): ValidatorRegistry {
  const createDef = (id: string, layer: 'L2' | 'L3' | 'L4', enabledCondition: 'always' | 'strictOnly' = 'always') =>
    ValidatorDefinition.create({
      validatorId: ValidatorId.create(id),
      layer,
      rules: [ValidationRule.create({
        ruleName: `${id}-rule`,
        errorTemplate: { code: id, severity: 'error', messageTemplate: '{{message}}' },
        fixExample: null,
      })],
      enabledCondition,
      externalPolicyRef: null,
    });

  return new ValidatorRegistry([
    createDef('L2-001', 'L2'),
    createDef('L2-002', 'L2'),
    createDef('L2-003', 'L2'),
    createDef('L2-013', 'L2'),
    createDef('L2-014', 'L2'),
    createDef('L2-015', 'L2'),
    createDef('L3-001', 'L3'),
    createDef('L3-002', 'L3', 'strictOnly'),
    createDef('L3-003', 'L3'),
    createDef('L3-004', 'L3'),
    createDef('L4-001', 'L4'),
    createDef('L4-002', 'L4'),
    createDef('L4-003', 'L4', 'strictOnly'),
    createDef('L4-004', 'L4'),
    createDef('L4-005', 'L4'),
    createDef('L4-006', 'L4'),
  ]);
}

/** Portモックパターン */
export const mockValidatorConfigPort = {
  getLayerConfig: vi.fn().mockReturnValue(createLayerConfig('L2')),
};

export const mockPhaseGatePolicyPort = {
  checkPrerequisites: vi.fn().mockResolvedValue({ satisfied: true, violations: [] }),
};

export const mockMetadataPolicyPort = {
  validateMetadata: vi.fn().mockResolvedValue({ passed: true, errors: [] }),
};

export const mockTestQualityAnalyzerPort = {
  analyzeTestFiles: vi.fn().mockResolvedValue({ results: [] }),
};

export const mockSecurityPatternScannerPort = {
  scan: vi.fn().mockResolvedValue({ passed: true, findings: [] }),
};

export const mockPerformanceScannerPort = {
  scan: vi.fn().mockResolvedValue({ passed: true, findings: [] }),
};

export const mockCoverageReportPort = {
  getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
};

export const mockAcCoveragePolicyPort = {
  getPolicy: vi.fn().mockResolvedValue({ check: vi.fn().mockReturnValue({ passed: true, errors: [] }) }),
};

export const mockRunL2UseCase = { execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L2-001' })]) };
export const mockRunL3UseCase = { execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L3-001' })]) };
export const mockRunL4UseCase = { execute: vi.fn().mockResolvedValue([createValidationResultContract({ validatorId: 'L4-001' })]) };
