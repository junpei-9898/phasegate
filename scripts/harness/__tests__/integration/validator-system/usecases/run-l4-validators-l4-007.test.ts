/**
 * @layer test
 * @unit validator-system
 * @story HF2-05
 * @work-item-id WI-222
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL4ValidatorsUseCase } from '../../../../validator-system/application/use-cases/run-l4-validators-usecase.js';
import { ValidatorExecutionService } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import { ValidatorRegistry } from '../../../../validator-system/domain/services/validator-registry.js';
import { ValidatorDefinition } from '../../../../validator-system/domain/value-objects/validator-definition.js';
import { ValidationRule } from '../../../../validator-system/domain/value-objects/validation-rule.js';
import { ValidatorId } from '../../../../validator-system/domain/value-objects/validator-id.js';
import { LayerConfig } from '../../../../validator-system/domain/value-objects/layer-config.js';
import type { AcLevelTraceabilityPort } from '../../../../validator-system/domain/ports/ac-level-traceability-port.js';
import type { AcLevelTraceabilitySnapshot } from '../../../../validator-system/domain/services/l4/ac-level-traceability-service.js';

function createDef(id: string): ValidatorDefinition {
  return ValidatorDefinition.create({
    validatorId: ValidatorId.create(id),
    layer: 'L4',
    rules: [ValidationRule.create({
      ruleName: `${id}-rule`,
      errorTemplate: { code: id, severity: 'error', messageTemplate: '{{message}}' },
      fixExample: null,
    })],
    enabledCondition: 'always',
    externalPolicyRef: null,
  });
}

function createUseCase(args: {
  snapshot: AcLevelTraceabilitySnapshot;
  enabledValidatorIds: string[];
}) {
  const registry = new ValidatorRegistry([createDef('L4-007')]);
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const layerConfig = LayerConfig.create({
    layer: 'L4',
    enabled: true,
    validatorIds: args.enabledValidatorIds,
    thresholds: {},
    strictOnly: false,
    preset: 'standard',
  });
  const configPort = {
    getLayerConfig: vi.fn().mockResolvedValue(layerConfig),
    getProjectLanguages: vi.fn().mockResolvedValue(['typescript']),
  };
  const acLevelTraceabilityPort: AcLevelTraceabilityPort = {
    collect: async () => args.snapshot,
  };
  return new RunL4ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper: mapper,
    acLevelTraceabilityPort,
  });
}

const BOUND_SNAPSHOT: AcLevelTraceabilitySnapshot = {
  acLevelCoverage: { total: 1, acBound: 1, fileFallbackOnly: 0 },
  fileFallbackOnlyAcs: [],
  orphanAcTags: [],
};

target('RunL4ValidatorsUseCase — L4-007 (ac-level-traceability advisory)', () => {
  describe('L4-007 advisory 実行', () => {
    context('fileFallbackOnly な AC が存在する場合', () => {
      // @ac AC-5
      it('warning severityの結果を返しerrorは出さないこと', async () => {
        // Arrange
        const usecase = createUseCase({
          enabledValidatorIds: ['L4-007'],
          snapshot: {
            acLevelCoverage: { total: 2, acBound: 1, fileFallbackOnly: 1 },
            fileFallbackOnlyAcs: [{ storyId: 'H05-02', acId: 'AC-1' }],
            orphanAcTags: [],
          },
        });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-007'], strictMode: false });

        // Assert
        const l4007 = actual.find((r) => r.validatorId === 'L4-007');
        expect(l4007?.passed).toBe(false);
        expect(l4007?.errors.every((e) => e.severity === 'warning')).toBe(true);
      });
    });

    context('全 AC が ac-bound の場合', () => {
      it('PASSになること', async () => {
        // Arrange
        const usecase = createUseCase({ enabledValidatorIds: ['L4-007'], snapshot: BOUND_SNAPSHOT });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-007'], strictMode: false });

        // Assert
        const l4007 = actual.find((r) => r.validatorId === 'L4-007');
        expect(l4007?.passed).toBe(true);
        expect(l4007?.skipped).toBe(false);
      });
    });

    context('orphanAcTags が存在する場合', () => {
      it('orphanAcTagsをadvisory warningとして報告すること', async () => {
        // Arrange
        const usecase = createUseCase({
          enabledValidatorIds: ['L4-007'],
          snapshot: {
            acLevelCoverage: { total: 1, acBound: 1, fileFallbackOnly: 0 },
            fileFallbackOnlyAcs: [],
            orphanAcTags: [{ storyId: 'H07-01', filePath: 'a.test.ts', rawTag: 'H99-99-1', reason: 'ac-not-in-story' }],
          },
        });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-007'], strictMode: false });

        // Assert
        const l4007 = actual.find((r) => r.validatorId === 'L4-007');
        expect(l4007?.passed).toBe(false);
        expect(l4007?.errors.some((e) => e.message.includes('H99-99-1'))).toBe(true);
        expect(l4007?.errors.every((e) => e.severity === 'warning')).toBe(true);
      });
    });

    context('L4-007 が enabled validator set に含まれない場合（default-OFF）', () => {
      // @ac AC-5
      it('skipped=trueで実行されないこと', async () => {
        // Arrange: enabled set に L4-007 を含めない
        const usecase = createUseCase({ enabledValidatorIds: ['L4-001'], snapshot: BOUND_SNAPSHOT });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L4-007'], strictMode: false });

        // Assert
        const l4007 = actual.find((r) => r.validatorId === 'L4-007');
        expect(l4007?.skipped).toBe(true);
      });
    });
  });
});
