// @layer test
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ConfigureCiGateUseCase } from '../../../regression-suite/application/usecases/configure-ci-gate-usecase.js';
import type { ConfigQueryPort } from '../../../regression-suite/domain/ports/config-query-port.js';
import type { SuiteIdValue } from '../../../regression-suite/domain/value-objects/suite-id.js';
import type { ConfigureCiGateInput } from '../../../regression-suite/application/dto/configure-ci-gate-input.js';

target('ConfigureCiGateUseCase', () => {
  let configQueryPort: ConfigQueryPort;
  let useCase: ConfigureCiGateUseCase;

  beforeEach(() => {
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(80) };
    useCase = new ConfigureCiGateUseCase(configQueryPort);
  });

  // IT-UC-ConfigCiGate-001
  describe("execute: coverageThresholdを指定して有効なCiGateConfigを生成すること", () => {
    context("requiredSuiteIds=['k-requirements','gng-gate']・coverageThreshold=90・executionMode='parallel' を指定した場合", () => {
      it("ConfigureCiGateOutput.requiredSuiteIds=['k-requirements','gng-gate']・coverageThreshold=90（入力値を優先）", async () => {
        // Arrange / Act
        const actual = await useCase.execute({
          requiredSuiteIds: ['k-requirements', 'gng-gate'],
          coverageThreshold: 90,
          executionMode: 'parallel',
        });

        // Assert
        expect(actual.requiredSuiteIds).toEqual(['k-requirements', 'gng-gate']);
        expect(actual.coverageThreshold).toBe(90);
      });
    });
  });

  // IT-UC-ConfigCiGate-002
  describe("execute: coverageThresholdが未指定のときConfigQueryPortのデフォルト値を使用すること", () => {
    context("coverageThreshold を省略した場合", () => {
      it('ConfigureCiGateOutput.coverageThreshold=80（ConfigQueryPort の返却値）', async () => {
        // Arrange / Act
        const actual = await useCase.execute({
          requiredSuiteIds: ['k-requirements'],
          executionMode: 'parallel',
        });

        // Assert
        expect(actual.coverageThreshold).toBe(80);
      });
    });
  });

  // IT-UC-ConfigCiGate-003
  describe("execute: executionMode='sequential'を設定できること", () => {
    it("ConfigureCiGateOutput.executionMode='sequential'", async () => {
      // Act
      const actual = await useCase.execute({
        requiredSuiteIds: ['k-requirements'], coverageThreshold: 90, executionMode: 'sequential',
      });

      // Assert
      expect(actual.executionMode).toBe('sequential');
    });
  });

  // IT-UC-ConfigCiGate-004
  describe('execute: 全4スイートIDを必須として設定できること', () => {
    it('ConfigureCiGateOutput.requiredSuiteIds.length=4', async () => {
      // Act
      const actual = await useCase.execute({
        requiredSuiteIds: ['k-requirements','gng-gate','agent-independence','v0-migration'],
        coverageThreshold: 90, executionMode: 'parallel',
      });

      // Assert
      expect(actual.requiredSuiteIds).toHaveLength(4);
    });
  });

  // IT-UC-ConfigCiGate-005
  describe("execute: coverageThreshold=0のときInvalidCoverageThresholdErrorをスローすること（INV-8）", () => {
    it('InvalidCoverageThresholdError がスロー', async () => {
      // Act / Assert
      await expect(useCase.execute({ requiredSuiteIds: ['k-requirements'], coverageThreshold: 0, executionMode: 'parallel' }))
        .rejects.toThrow('InvalidCoverageThresholdError');
    });
  });

  // IT-UC-ConfigCiGate-006
  describe('execute: 不正なSuiteId文字列のときInvalidSuiteIdErrorをスローすること', () => {
    it('InvalidSuiteIdError がスロー', async () => {
      // Act / Assert
      const input: ConfigureCiGateInput = {
        requiredSuiteIds: ['unknown-suite' as SuiteIdValue],
        coverageThreshold: 90,
        executionMode: 'parallel',
      };
      await expect(useCase.execute(input))
        .rejects.toThrow('InvalidSuiteIdError');
    });
  });
});
