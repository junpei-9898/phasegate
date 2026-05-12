// @layer test
// @unit harness-api
// @story H09-02
// @work-item-id WI-114
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
    it('phasegate:check-readyが全ストーリー通過のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
        { storyId: 'H09-01', passed: true },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:check-ready', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
      expect(actual.exitCode).toBe(0);
    });

    // UT-DS-002
    it('phasegate:check-readyが未通過ストーリーありのfail responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
        { storyId: 'H09-01', passed: false },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:check-ready', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('fail');
      expect(actual.exitCode).toBe(1);
    });
  });

  describe('dispatch: check-phase', () => {
    // UT-DS-003
    it('phasegate:check-phaseが存在するUnitのpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryUnit.mockResolvedValue({
        unitId: 'harness-error', currentLevel: 2, currentPhase: 'construction', completedGates: [],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:check-phase', args: { unit: 'harness-error' }, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });

    // UT-DS-004
    it('phasegate:check-phaseが存在しないUnitのfail responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.phaseGateQueryPort.queryUnit.mockResolvedValue(null);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:check-phase', args: { unit: 'non-existent' }, flags: {} });
      // Assert
      expect(actual.status).toBe('fail');
    });
  });

  describe('dispatch: ci-check', () => {
    // UT-DS-005
    it('phasegate:ci-checkが全バリデータ通過のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runAllValidators.mockResolvedValue([
        { validatorId: 'L2-001', passed: true, errors: [] },
        { validatorId: 'L3-001', passed: true, errors: [] },
        { validatorId: 'L4-001', passed: false, skipped: true, errors: [] },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:ci-check', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
      expect(ports.validatorExecutionPort.runAllValidators).toHaveBeenCalledTimes(1);
      expect(ports.validatorExecutionPort.runL3Validators).not.toHaveBeenCalled();
      expect(actual.data).toMatchObject({
        validatorResults: [
          { validatorId: 'L2-001' },
          { validatorId: 'L3-001' },
          { validatorId: 'L4-001', skipped: true },
        ],
      });
    });
  });

  describe('dispatch: detect-drift', () => {
    // UT-DS-006
    it('phasegate:detect-driftが乖離なしのpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:detect-drift', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });

    it('phasegate:detect-driftが乖離ありでもadvisory pass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([
        { direction: 'code→design', unit: 'validator-system', element: 'RunFullValidationUseCase', recommendation: 'Review design docs' },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:detect-drift', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
      expect(actual.exitCode).toBe(0);
      expect(actual.errors).toEqual([]);
      expect(actual.summary).toMatchObject({ warnings: 1 });
      expect(actual.data).toMatchObject({
        categorySummaries: [
          {
            category: 'code-missing-design',
            severity: 'warning',
            count: 1,
          },
        ],
        actionPlan: [
          {
            category: 'code-missing-design',
            nextAction: 'Update the matching product/construction docs with the implementation contract.',
          },
        ],
      });
    });
  });

  describe('dispatch: lint', () => {
    // UT-DS-007
    it('phasegate:lintがpass結果のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.biomeLintPort.runLint.mockResolvedValue({ passed: true, errors: [], warnings: [] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:lint', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });

  describe('dispatch: status', () => {
    // UT-DS-008
    it('phasegate:statusがpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.artifactScannerPort.scan.mockResolvedValue(
        ArtifactScanResult.create({ scannedPaths: [], foundArtifacts: [], derivedLayerHealth: [] })
      );
      ports.configQueryPort.getPresetInfo.mockResolvedValue({ name: 'standard', enabledLayers: ['L1', 'L2', 'L3'] });
      ports.biomeLintPort.runLint.mockResolvedValue({ passed: false, errors: [], warnings: [] });
      ports.validatorExecutionPort.runAllValidators.mockResolvedValue([
        { validatorId: 'L2-001', passed: true, errors: [] },
        { validatorId: 'L3-001', passed: true, errors: [] },
        { validatorId: 'L4-001', passed: false, skipped: true, errors: [] },
      ]);
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:status', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
      expect(actual.exitCode).toBe(0);
      expect(actual.data).toMatchObject({
        layers: [
          { layerId: 'L1', lastResult: 'fail', configurationState: 'enabled', liveValidationState: 'fail' },
          { layerId: 'L2', lastResult: 'pass', configurationState: 'enabled', liveValidationState: 'pass' },
          { layerId: 'L3', lastResult: 'pass', configurationState: 'enabled', liveValidationState: 'pass' },
          { layerId: 'L4', enabled: false, configurationState: 'disabled', liveValidationState: 'skipped' },
        ],
      });
    });
  });

  describe('dispatch: impact-analysis', () => {
    // UT-DS-009
    it('phasegate:impact-analysisが結果ありのpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.impactAnalysisPort.analyze.mockResolvedValue({
        storyId: 'H09-01', affectedTestCases: [], affectedFiles: [],
      });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:impact-analysis', args: { storyId: 'H09-01' }, flags: {} });
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
      const actual = await svc.dispatch({ commandName: 'phasegate:unknown', args: {}, flags: {} });
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
      ports.validatorExecutionPort.runAllValidators.mockRejectedValue(new Error('port error'));
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:ci-check', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('error');
      expect(actual.exitCode).toBe(2);
    });
  });

  describe('dispatch: complete-check', () => {
    // UT-DS-012
    it('phasegate:complete-checkが全バリデータ+lint通過のpass responseを返すこと', async () => {
      // Arrange
      const ports = createMockPorts();
      ports.validatorExecutionPort.runAllValidators.mockResolvedValue([
        { validatorId: 'L3-001', passed: true, errors: [] },
      ]);
      ports.biomeLintPort.runLint.mockResolvedValue({ passed: true, errors: [], warnings: [] });
      const svc = new CommandDispatchService(ports);
      // Act
      const actual = await svc.dispatch({ commandName: 'phasegate:complete-check', args: {}, flags: {} });
      // Assert
      expect(actual.status).toBe('pass');
    });
  });
});
