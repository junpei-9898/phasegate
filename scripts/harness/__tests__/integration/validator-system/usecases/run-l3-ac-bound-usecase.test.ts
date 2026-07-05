/**
 * @layer test
 * @unit validator-system
 * @story H16-03
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL3ValidatorsUseCase } from '../../../../validator-system/application/use-cases/run-l3-validators-usecase.js';
import { ValidatorExecutionService } from '../../../../validator-system/domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import { ValidatorRegistry } from '../../../../validator-system/domain/services/validator-registry.js';
import { ValidatorDefinition } from '../../../../validator-system/domain/value-objects/validator-definition.js';
import { ValidatorId } from '../../../../validator-system/domain/value-objects/validator-id.js';
import { ValidationRule } from '../../../../validator-system/domain/value-objects/validation-rule.js';
import { LayerConfig } from '../../../../validator-system/domain/value-objects/layer-config.js';

function defOf(id: string): ValidatorDefinition {
  return ValidatorDefinition.create({
    validatorId: ValidatorId.create(id),
    layer: 'L3',
    rules: [ValidationRule.create({ ruleName: `${id}-rule`, errorTemplate: { code: id, severity: 'error', messageTemplate: '{{message}}' }, fixExample: null })],
    enabledCondition: 'always',
    externalPolicyRef: null,
  });
}

function registryWithL3005(): ValidatorRegistry {
  return new ValidatorRegistry([defOf('L3-001'), defOf('L3-003'), defOf('L3-004'), defOf('L3-005')]);
}

function createUseCase(opts: {
  enabledValidatorIds: string[];
  acBoundPassed?: boolean;
  acBoundPort?: { checkAcBoundCoverage: ReturnType<typeof vi.fn> };
}) {
  const registry = registryWithL3005();
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const configPort = {
    getLayerConfig: vi.fn().mockResolvedValue(
      LayerConfig.create({ layer: 'L3', enabled: true, validatorIds: opts.enabledValidatorIds, thresholds: {}, strictOnly: false, preset: 'standard' }),
    ),
  };
  const acBoundPort =
    opts.acBoundPort ??
    { checkAcBoundCoverage: vi.fn().mockResolvedValue({ passed: opts.acBoundPassed ?? true, errors: [] }) };
  const usecase = new RunL3ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: configPort,
    contractMapper: mapper,
    acBoundCoveragePolicyPort: acBoundPort,
    acBoundStories: ['HF2-05'],
  });
  return { usecase, acBoundPort };
}

target('RunL3ValidatorsUseCase — L3-005 (AC-bound coverage)', () => {
  describe('default-OFF 挙動', () => {
    context('L3-005 が config で有効化されていない場合', () => {
      it('L3-005 は skipped=true で返り policy port は呼ばれないこと (IT-L3005-UC-001)', async () => {
        // Arrange — enabled 集合に L3-005 を含めない
        const { usecase, acBoundPort } = createUseCase({ enabledValidatorIds: ['L3-001', 'L3-003', 'L3-004'] });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L3-005'], targetPaths: ['src/'] });

        // Assert
        const l3005 = actual.find((r) => r.validatorId === 'L3-005');
        expect(l3005?.skipped).toBe(true);
        expect(acBoundPort.checkAcBoundCoverage).not.toHaveBeenCalled();
      });
    });
  });

  describe('有効化時の挙動', () => {
    context('L3-005 が有効化されスコープ内 story が全 AC ac-bound な場合', () => {
      it('L3-005 が passed=true, skipped=false で返ること (IT-L3005-UC-002)', async () => {
        // Arrange
        const { usecase, acBoundPort } = createUseCase({
          enabledValidatorIds: ['L3-001', 'L3-003', 'L3-004', 'L3-005'],
          acBoundPassed: true,
        });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L3-005'], targetPaths: ['src/'], acBoundStories: ['HF2-05'] });

        // Assert
        const l3005 = actual.find((r) => r.validatorId === 'L3-005');
        expect(l3005?.passed).toBe(true);
        expect(l3005?.skipped).toBe(false);
        expect(acBoundPort.checkAcBoundCoverage).toHaveBeenCalledWith(
          expect.objectContaining({ acBoundStories: ['HF2-05'] }),
        );
      });
    });

    context('L3-005 が有効化されスコープ内 AC が file-fallback のみの場合', () => {
      it('fail-closed で L3-005 が passed=false で返ること (IT-L3005-UC-003)', async () => {
        // Arrange
        const acBoundPort = {
          checkAcBoundCoverage: vi.fn().mockResolvedValue({
            passed: false,
            errors: [{ code: { value: 'L3-005', toString: () => 'L3-005' }, severity: { value: 'error', toString: () => 'error' }, message: 'HF2-05.AC-2 は ac-binding を欠く', suggestion: '' }],
          }),
        };
        const { usecase } = createUseCase({ enabledValidatorIds: ['L3-001', 'L3-003', 'L3-004', 'L3-005'], acBoundPort });

        // Act
        const actual = await usecase.execute({ validatorIds: ['L3-005'], targetPaths: ['src/'], acBoundStories: ['HF2-05'] });

        // Assert
        const l3005 = actual.find((r) => r.validatorId === 'L3-005');
        expect(l3005?.passed).toBe(false);
        expect(l3005?.skipped).toBe(false);
      });
    });
  });
});
