/**
 * RunL0ValidatorsUseCase ユニットテスト
 * ポートモック注入によるUseCaseコアロジックの検証
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunL0ValidatorsUseCase } from '../../../validator-system/application/use-cases/run-l0-validators-usecase.js';
import { ValidatorRegistry } from '../../../validator-system/domain/services/validator-registry.js';
import { ValidatorExecutionService } from '../../../validator-system/domain/services/validator-execution-service.js';
import { ValidationResultContractMapper } from '../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import { ValidatorId } from '../../../validator-system/domain/value-objects/validator-id.js';
import { ValidatorDefinition } from '../../../validator-system/domain/value-objects/validator-definition.js';
import { ValidationRule } from '../../../validator-system/domain/value-objects/validation-rule.js';
import { LayerConfig } from '../../../validator-system/domain/value-objects/layer-config.js';
import type { ValidatorConfigPort } from '../../../validator-system/domain/ports/validator-config-port.js';

// --- テストヘルパー ---

function createL0Definitions(): ValidatorDefinition[] {
  const rule = ValidationRule.create({
    ruleName: 'R-L0-001',
    description: 'test rule',
    errorTemplate: { code: 'L0-001', severity: 'error', messageTemplate: 'test' },
    fixExample: null,
  });
  return [
    ValidatorDefinition.create({
      validatorId: ValidatorId.create('L0-001'),
      layer: 'L0',
      name: 'hook-config',
      description: 'Hook config validation',
      rules: [rule],
      enabledCondition: 'layerEnabled',
      externalPolicyRef: null,
    }),
  ];
}

function createEnabledConfigPort(): ValidatorConfigPort {
  return {
    getLayerConfig: async (layer) =>
      LayerConfig.create({
        layer,
        enabled: true,
        validatorIds: ['L0-001'],
        thresholds: {},
        strictOnly: false,
        preset: 'standard',
      }),
  };
}

function createDisabledConfigPort(): ValidatorConfigPort {
  return {
    getLayerConfig: async (layer) =>
      LayerConfig.create({
        layer,
        enabled: false,
        validatorIds: ['L0-001'],
        thresholds: {},
        strictOnly: false,
        preset: 'standard',
      }),
  };
}

function buildUseCase(options?: {
  configPort?: ValidatorConfigPort;
}): RunL0ValidatorsUseCase {
  const definitions = createL0Definitions();
  const registry = new ValidatorRegistry(definitions);
  const executionService = new ValidatorExecutionService({});
  const contractMapper = new ValidationResultContractMapper();

  return new RunL0ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: options?.configPort ?? createEnabledConfigPort(),
    contractMapper,
  });
}

// --- テスト ---

target('RunL0ValidatorsUseCase（UT）', () => {
  context('基本動作', () => {
    it('UT-L0-001 L0有効時にバリデータ結果が返されること', async () => {
      // Arrange
      const sut = buildUseCase();
      // Act
      const results = await sut.execute({});
      // Assert
      expect(results).toHaveLength(1);
      expect(results.every((r) => r.passed)).toBe(true);
    });
  });

  context('レイヤー無効化', () => {
    it('UT-L0-002 L0無効時に空配列が返されること', async () => {
      // Arrange
      const sut = buildUseCase({
        configPort: createDisabledConfigPort(),
      });
      // Act
      const results = await sut.execute({});
      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
