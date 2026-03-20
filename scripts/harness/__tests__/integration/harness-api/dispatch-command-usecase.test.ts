import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { DispatchCommandUseCase } from '../../../harness-api/application/usecases/dispatch-command-usecase.js';
import type { ValidatorExecutionPort } from '../../../harness-api/domain/ports/validator-execution-port.js';
import type { PhaseGateQueryPort } from '../../../harness-api/domain/ports/phase-gate-query-port.js';
import type { BiomeLintPort } from '../../../harness-api/domain/ports/biome-lint-port.js';
import type { ImpactAnalysisPort } from '../../../harness-api/domain/ports/impact-analysis-port.js';
import type { ArtifactScannerPort } from '../../../harness-api/domain/ports/artifact-scanner-port.js';

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

function createDispatchCommandUseCase(ports: ReturnType<typeof createMockPorts>) {
  return new DispatchCommandUseCase({
    validatorExecutionPort: ports.validatorExecutionPort,
    phaseGateQueryPort: ports.phaseGateQueryPort,
    biomeLintPort: ports.biomeLintPort,
    impactAnalysisPort: ports.impactAnalysisPort,
    artifactScannerPort: ports.artifactScannerPort,
    configQueryPort: ports.configQueryPort,
  });
}

target('DispatchCommandUseCase.execute', () => {
  let ports: ReturnType<typeof createMockPorts>;
  let useCase: DispatchCommandUseCase;

  beforeEach(() => {
    ports = createMockPorts();
    useCase = createDispatchCommandUseCase(ports);
  });

  // ─── IT-UC-DispatchCmd-001 ───
  describe('check-readyコマンドが全ストーリー通過状態を返すこと', () => {
    context('PhaseGateQueryPortが3件全通過のPhaseGateStoryResult[]を返す場合', () => {
      it('response.status=pass・exitCode=0・data.allPassed=trueが返される', async () => {
        // Arrange
        ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
          { storyId: 'H09-01', passed: true, missingPhases: [] },
          { storyId: 'H09-02', passed: true, missingPhases: [] },
          { storyId: 'H09-03', passed: true, missingPhases: [] },
        ]);

        // Act
        const actual = await useCase.execute({ commandName: 'harness:check-ready', args: {}, flags: {} });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect((actual.response.data as { allPassed: boolean }).allPassed).toBe(true);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-002 ───
  describe('check-phaseコマンドが指定UnitのPhaseInfoを返すこと', () => {
    context('PhaseGateQueryPortがPhaseInfo(currentLevel=2)を返す場合', () => {
      it('response.status=pass・response.data.unitId=harness-errorが返される', async () => {
        // Arrange
        ports.phaseGateQueryPort.queryUnit.mockResolvedValue({
          unitId: 'harness-error',
          currentLevel: 2,
          currentPhase: 'construction',
          completedGates: ['domain-design', 'logical-design'],
        });

        // Act
        const actual = await useCase.execute({ commandName: 'harness:check-phase', args: { unit: 'harness-error' }, flags: {} });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect((actual.response.data as { unitId: string }).unitId).toBe('harness-error');
      });
    });
  });

  // ─── IT-UC-DispatchCmd-003 ───
  describe('ci-checkコマンドが全L3バリデータ通過を返すこと', () => {
    context('ValidatorExecutionPortが4件全通過のValidatorCheckItem[]を返す場合', () => {
      it('response.status=pass・data.allPassed=trueが返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runL3Validators.mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
          { validatorId: 'L3-002', passed: true, errors: [] },
          { validatorId: 'L3-003', passed: true, errors: [] },
          { validatorId: 'L3-004', passed: true, errors: [] },
        ]);

        // Act
        const actual = await useCase.execute({ commandName: 'harness:ci-check', args: {}, flags: {} });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect((actual.response.data as { allPassed: boolean }).allPassed).toBe(true);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-004 ───
  describe('detect-driftコマンドが乖離なしを返すこと', () => {
    context('ValidatorExecutionPortのrunDriftDetectionが空配列を返す場合', () => {
      it('response.status=pass・data.totalCount=0が返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([]);

        // Act
        const actual = await useCase.execute({ commandName: 'harness:detect-drift', args: {}, flags: {} });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect((actual.response.data as { totalCount: number }).totalCount).toBe(0);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-005 ───
  describe('lintコマンドがpass結果を返すこと', () => {
    context('BiomeLintPortが{passed:true, errors:[], warnings:[]}を返す場合', () => {
      it('response.status=pass・exitCode=0が返される', async () => {
        // Arrange
        ports.biomeLintPort.runLint.mockResolvedValue({ passed: true, errors: [], warnings: [] });

        // Act
        const actual = await useCase.execute({ commandName: 'harness:lint', args: {}, flags: {} });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-006 ───
  describe('impact-analysisコマンドが影響テストケースを返すこと', () => {
    context("ImpactAnalysisPortがstoryId='H09-01'のImpactAnalysisResultを返す場合", () => {
      it('response.status=pass・response.data!=nullが返される', async () => {
        // Arrange
        ports.impactAnalysisPort.analyze.mockResolvedValue({
          storyId: 'H09-01',
          affectedTestCases: ['IT-UC-DispatchCmd-001'],
          affectedFiles: ['dispatch-command-usecase.ts'],
        });

        // Act
        const actual = await useCase.execute({ commandName: 'harness:impact-analysis', args: { storyId: 'H09-01' }, flags: {} });

        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data).not.toBeNull();
      });
    });
  });

  // ─── IT-UC-DispatchCmd-007 ───
  describe('未登録コマンド名の場合、exitCode=2のerror responseを返すこと', () => {
    context("commandName='harness:unknown-cmd'（未登録）を渡した場合", () => {
      it('response.status=error・exitCode=2・errors.length>=1が返される', async () => {
        // Arrange (no setup needed)

        // Act
        const actual = await useCase.execute({ commandName: 'harness:unknown-cmd', args: {}, flags: {} });

        // Assert
        expect(actual.response.status).toBe('error');
        expect(actual.exitCode).toBe(2);
        expect(actual.response.errors.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-008 ───
  describe('check-phaseで存在しないUnit名を指定した場合、exitCode=1のfail responseを返すこと', () => {
    context('PhaseGateQueryPortのqueryUnitがnullを返す場合', () => {
      it('response.status=fail・exitCode=1が返される', async () => {
        // Arrange
        ports.phaseGateQueryPort.queryUnit.mockResolvedValue(null);

        // Act
        const actual = await useCase.execute({ commandName: 'harness:check-phase', args: { unit: 'non-existent-unit' }, flags: {} });

        // Assert
        expect(actual.response.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-009 ───
  describe('ポート呼び出しが例外をスローした場合、exitCode=2のerror responseを返すこと', () => {
    context('ValidatorExecutionPortがnetwork errorをスローする場合', () => {
      it('response.status=error・exitCode=2が返され、UseCase外に例外が伝播しない', async () => {
        // Arrange
        ports.validatorExecutionPort.runL3Validators.mockRejectedValue(new Error('network error'));

        // Act
        const actual = await useCase.execute({ commandName: 'harness:ci-check', args: {}, flags: {} });

        // Assert
        expect(actual.response.status).toBe('error');
        expect(actual.exitCode).toBe(2);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-010 ───
  describe('detect-driftで乖離が検出された場合、exitCode=1のfail responseを返すこと', () => {
    context('ValidatorExecutionPortが1件のDriftItemを返す場合', () => {
      it('response.status=fail・exitCode=1・data.totalCount=1が返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([
          { direction: 'design-to-code', unit: 'harness-api', element: 'CliCommand', recommendation: 'CommandRegistryへの登録を確認してください' },
        ]);

        // Act
        const actual = await useCase.execute({ commandName: 'harness:detect-drift', args: {}, flags: {} });

        // Assert
        expect(actual.response.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
        expect((actual.response.data as { totalCount: number }).totalCount).toBe(1);
      });
    });
  });

  // ─── IT-UC-DispatchCmd-011 ───
  describe('complete-checkコマンドがValidatorExecutionPortとBiomeLintPortの両方を呼び出すこと', () => {
    context('両ポートが正常値を返す場合', () => {
      it('両ポートがそれぞれ1回ずつ呼び出され、response.status=passが返される', async () => {
        // Arrange
        ports.validatorExecutionPort.runAllValidators.mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
        ]);
        ports.biomeLintPort.runLint.mockResolvedValue({ passed: true, errors: [], warnings: [] });

        // Act
        const actual = await useCase.execute({ commandName: 'harness:complete-check', args: {}, flags: {} });

        // Assert
        expect(ports.validatorExecutionPort.runAllValidators).toHaveBeenCalledTimes(1);
        expect(ports.biomeLintPort.runLint).toHaveBeenCalledTimes(1);
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
      });
    });
  });
});
