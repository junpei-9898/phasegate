/**
 * RunL0ValidatorsUseCase ユニットテスト
 * ポートモック注入によるUseCaseコアロジックの検証
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RunL0ValidatorsUseCase } from '../../../validator-system/application/use-cases/run-l0-validators-usecase.js';
import type { FuseHookConfigValidatorPort, FuseMountStatusPort } from '../../../validator-system/application/use-cases/run-l0-validators-usecase.js';
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
      name: 'fuse-hook-config',
      description: 'FUSE hook config validation',
      rules: [rule],
      enabledCondition: 'layerEnabled',
      externalPolicyRef: null,
    }),
    ValidatorDefinition.create({
      validatorId: ValidatorId.create('L0-002'),
      layer: 'L0',
      name: 'fuse-mount-status',
      description: 'FUSE mount status check',
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
        validatorIds: ['L0-001', 'L0-002'],
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
        validatorIds: ['L0-001', 'L0-002'],
        thresholds: {},
        strictOnly: false,
        preset: 'standard',
      }),
  };
}

function buildUseCase(options?: {
  configPort?: ValidatorConfigPort;
  fuseHookConfigValidatorPort?: FuseHookConfigValidatorPort;
  fuseMountStatusPort?: FuseMountStatusPort;
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
    fuseHookConfigValidatorPort: options?.fuseHookConfigValidatorPort,
    fuseMountStatusPort: options?.fuseMountStatusPort,
  });
}

// --- テスト ---

target('RunL0ValidatorsUseCase（UT）', () => {
  context('FuseHookConfigValidatorPort注入', () => {
    it('UT-L0-001 validateConfigが呼ばれ、成功時はpassが維持されること', async () => {
      // Arrange
      let calledWith = '';
      const mockPort: FuseHookConfigValidatorPort = {
        validateConfig: async (path) => {
          calledWith = path;
          return { passed: true, errors: [] };
        },
      };
      const sut = buildUseCase({ fuseHookConfigValidatorPort: mockPort });
      // Act
      const results = await sut.execute({});
      // Assert
      expect(calledWith).toBe('.harness-hooks.yml');
      const l0001 = results.find((r) => r.validatorId === 'L0-001');
      expect(l0001).toBeDefined();
      expect(l0001!.passed).toBe(true);
    });

    it('UT-L0-002 validateConfigが失敗時にL0-001がfailに上書きされること', async () => {
      // Arrange
      const mockPort: FuseHookConfigValidatorPort = {
        validateConfig: async () => ({
          passed: false,
          errors: [{
            code: { value: 'HOOK_CONFIG_INVALID', toString: () => 'HOOK_CONFIG_INVALID' },
            severity: { value: 'error', toString: () => 'error' },
            message: 'Invalid hook config',
            suggestion: 'Fix the config file',
          }],
        }),
      };
      const sut = buildUseCase({ fuseHookConfigValidatorPort: mockPort });
      // Act
      const results = await sut.execute({});
      // Assert
      const l0001 = results.find((r) => r.validatorId === 'L0-001');
      expect(l0001).toBeDefined();
      expect(l0001!.passed).toBe(false);
      expect(l0001!.errors).toHaveLength(1);
      expect(l0001!.errors[0].message).toBe('Invalid hook config');
    });

    it('UT-L0-003 カスタムhookConfigPathが渡されること', async () => {
      // Arrange
      let calledWith = '';
      const mockPort: FuseHookConfigValidatorPort = {
        validateConfig: async (path) => {
          calledWith = path;
          return { passed: true, errors: [] };
        },
      };
      const sut = buildUseCase({ fuseHookConfigValidatorPort: mockPort });
      // Act
      await sut.execute({ hookConfigPath: 'custom/hooks.yml' });
      // Assert
      expect(calledWith).toBe('custom/hooks.yml');
    });
  });

  context('FuseMountStatusPort注入', () => {
    it('UT-L0-004 checkStatusが呼ばれ、available=trueでpassが維持されること', async () => {
      // Arrange
      let called = false;
      const mockPort: FuseMountStatusPort = {
        checkStatus: async () => {
          called = true;
          return { available: true, errors: [] };
        },
      };
      const sut = buildUseCase({ fuseMountStatusPort: mockPort });
      // Act
      const results = await sut.execute({});
      // Assert
      expect(called).toBe(true);
      const l0002 = results.find((r) => r.validatorId === 'L0-002');
      expect(l0002).toBeDefined();
      expect(l0002!.passed).toBe(true);
    });

    it('UT-L0-005 checkStatusがavailable=falseでL0-002がfailに上書きされること', async () => {
      // Arrange
      const mockPort: FuseMountStatusPort = {
        checkStatus: async () => ({
          available: false,
          errors: [{
            code: { value: 'FUSE_NOT_AVAILABLE', toString: () => 'FUSE_NOT_AVAILABLE' },
            severity: { value: 'error', toString: () => 'error' },
            message: 'FUSE is not available',
            suggestion: 'Install FUSE',
          }],
        }),
      };
      const sut = buildUseCase({ fuseMountStatusPort: mockPort });
      // Act
      const results = await sut.execute({});
      // Assert
      const l0002 = results.find((r) => r.validatorId === 'L0-002');
      expect(l0002).toBeDefined();
      expect(l0002!.passed).toBe(false);
      expect(l0002!.errors[0].message).toBe('FUSE is not available');
    });
  });

  context('ポート未注入時', () => {
    it('UT-L0-006 ポート未注入でもpassが返されること（デフォルト動作）', async () => {
      // Arrange
      const sut = buildUseCase();
      // Act
      const results = await sut.execute({});
      // Assert
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });
  });

  context('レイヤー無効化', () => {
    it('UT-L0-007 L0無効時にポートが呼ばれず空配列が返されること', async () => {
      // Arrange
      let hookCalled = false;
      let statusCalled = false;
      const sut = buildUseCase({
        configPort: createDisabledConfigPort(),
        fuseHookConfigValidatorPort: {
          validateConfig: async () => { hookCalled = true; return { passed: true, errors: [] }; },
        },
        fuseMountStatusPort: {
          checkStatus: async () => { statusCalled = true; return { available: true, errors: [] }; },
        },
      });
      // Act
      const results = await sut.execute({});
      // Assert
      expect(results).toHaveLength(0);
      expect(hookCalled).toBe(false);
      expect(statusCalled).toBe(false);
    });
  });

  context('両ポート同時失敗', () => {
    it('UT-L0-008 両ポートが失敗時に両方のバリデータがfailになること', async () => {
      // Arrange
      const sut = buildUseCase({
        fuseHookConfigValidatorPort: {
          validateConfig: async () => ({
            passed: false,
            errors: [{
              code: { value: 'E1', toString: () => 'E1' },
              severity: { value: 'error', toString: () => 'error' },
              message: 'config error',
              suggestion: '',
            }],
          }),
        },
        fuseMountStatusPort: {
          checkStatus: async () => ({
            available: false,
            errors: [{
              code: { value: 'E2', toString: () => 'E2' },
              severity: { value: 'error', toString: () => 'error' },
              message: 'mount error',
              suggestion: '',
            }],
          }),
        },
      });
      // Act
      const results = await sut.execute({});
      // Assert
      expect(results).toHaveLength(2);
      expect(results.every((r) => !r.passed)).toBe(true);
      expect(results[0].errors[0].message).toBe('config error');
      expect(results[1].errors[0].message).toBe('mount error');
    });
  });
});
