import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CommandDispatchService } from '../../../harness-api/domain/services/command-dispatch-service.js';
import type { ValidatorExecutionPort } from '../../../harness-api/domain/ports/validator-execution-port.js';
import type { PhaseGateQueryPort } from '../../../harness-api/domain/ports/phase-gate-query-port.js';
import type { BiomeLintPort } from '../../../harness-api/domain/ports/biome-lint-port.js';
import type { ImpactAnalysisPort } from '../../../harness-api/domain/ports/impact-analysis-port.js';
import type { ArtifactScannerPort } from '../../../harness-api/domain/ports/artifact-scanner-port.js';
import { ArtifactScanResult } from '../../../harness-api/domain/value-objects/artifact-scan-result.js';

function createMockPorts() {
  return {
    validatorExecutionPort: {
      runL3Validators: vi.fn(),
      runAllValidators: vi.fn(),
      runDriftDetection: vi.fn(),
    } satisfies ValidatorExecutionPort,
    phaseGateQueryPort: {
      queryAllStories: vi.fn(),
      queryUnit: vi.fn(),
    } satisfies PhaseGateQueryPort,
    biomeLintPort: {
      runLint: vi.fn(),
    } satisfies BiomeLintPort,
    impactAnalysisPort: {
      analyze: vi.fn(),
    } satisfies ImpactAnalysisPort,
    artifactScannerPort: {
      scan: vi.fn(),
    } satisfies ArtifactScannerPort,
    configQueryPort: {
      getPresetInfo: vi.fn(),
      getConfigSummary: vi.fn(),
    },
  };
}

target('CommandDispatchService', () => {
  describe('dispatch: check-ready', () => {
    // UT-DS-001
    it('harness:check-readyが全ストーリー通過のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
        { storyId: 'H09-01', passed: true },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:check-ready', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
      expect(actual.exitCode).toBe(0);
    });

    // UT-DS-002
    it('harness:check-readyが未通過ストーリーありのfail responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
        { storyId: 'H09-01', passed: false },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:check-ready', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('fail');
      expect(actual.exitCode).toBe(1);
    });
  });

  describe('dispatch: check-phase', () => {
    // UT-DS-003
    it('harness:check-phaseが存在するUnitのpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryUnit.mockResolvedValue({
        unitId: 'harness-error', currentLevel: 2, currentPhase: 'construction', completedGates: [],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:check-phase', args: { unit: 'harness-error' }, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });

    // UT-DS-004
    it('harness:check-phaseが存在しないUnitのfail responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryUnit.mockResolvedValue(null);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:check-phase', args: { unit: 'non-existent' }, flags: {} });
      // Assert
      expect(actual.status).toBe('fail');
    });
  });

  describe('dispatch: ci-check', () => {
    // UT-DS-005
    it('harness:ci-checkが全バリデータ通過のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runL3Validators.mockResolvedValue([
        { validatorId: 'L3-001', passed: true, errors: [] },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:ci-check', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });

  describe('dispatch: detect-drift', () => {
    // UT-DS-006
    it('harness:detect-driftが乖離なしのpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:detect-drift', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });

  describe('dispatch: lint', () => {
    // UT-DS-007
    it('harness:lintがpass結果のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.biomeLintPort.runLint.mockResolvedValue({ passed: true, errors: [], warnings: [] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:lint', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });

  describe('dispatch: status', () => {
    // UT-DS-008
    it('harness:statusがpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.artifactScannerPort.scan.mockResolvedValue(
        ArtifactScanResult.create({ scannedPaths: [], foundArtifacts: [], derivedLayerHealth: [] })
      );
      ports.configQueryPort.getPresetInfo.mockResolvedValue({ name: 'standard', enabledLayers: ['L1', 'L2', 'L3'] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:status', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });

  describe('dispatch: impact-analysis', () => {
    // UT-DS-009
    it('harness:impact-analysisが結果ありのpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.impactAnalysisPort.analyze.mockResolvedValue({
        storyId: 'H09-01', affectedTestCases: [], affectedFiles: [],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:impact-analysis', args: { storyId: 'H09-01' }, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });

  describe('dispatch: 未登録コマンド', () => {
    // UT-DS-010
    it('未知コマンドでerror responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:unknown', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('error');
      expect(actual.exitCode).toBe(2);
    });
  });

  describe('dispatch: ポートエラー', () => {
    // UT-DS-011
    it('ポートが例外をスローした場合にerror responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runL3Validators.mockRejectedValue(new Error('port error'));
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:ci-check', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('error');
      expect(actual.exitCode).toBe(2);
    });
  });

  describe('dispatch: complete-check', () => {
    // UT-DS-012
    it('harness:complete-checkが全バリデータ+lint通過のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runAllValidators.mockResolvedValue([
        { validatorId: 'L3-001', passed: true, errors: [] },
      ]);
      ports.biomeLintPort.runLint.mockResolvedValue({ passed: true, errors: [], warnings: [] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'harness:complete-check', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });
});
