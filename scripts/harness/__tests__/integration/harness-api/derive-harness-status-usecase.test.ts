// @layer test
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { DeriveHarnessStatusUseCase } from '../../../harness-api/application/usecases/derive-harness-status-usecase.js';
import { StatusDerivationService } from '../../../harness-api/domain/services/status-derivation-service.js';
import { ArtifactScanResult } from '../../../harness-api/domain/value-objects/artifact-scan-result.js';

function createStatusDeps() {
  return {
    artifactScannerPort: {
      scan: vi.fn(),
    },
    configQueryPort: {
      getPresetInfo: vi.fn(),
      getConfigSummary: vi.fn(),
      getPhaseGateSummary: vi.fn(),
    },
    statusDerivationService: new StatusDerivationService(),
  };
}

function makeFullScanResult() {
  return ArtifactScanResult.create({
    scannedPaths: [],
    foundArtifacts: [
      { layer: 'L1', present: true },
      { layer: 'L2', present: true },
      { layer: 'L3', present: true },
    ],
    derivedLayerHealth: [],
  });
}

target('DeriveHarnessStatusUseCase.execute', () => {
  let deps: ReturnType<typeof createStatusDeps>;
  let useCase: DeriveHarnessStatusUseCase;

  beforeEach(() => {
    deps = createStatusDeps();
    useCase = new DeriveHarnessStatusUseCase(deps);
  });

  // ─── IT-UC-DeriveStatus-001 ───
  describe('standardプリセットでL1-L3有効かつ全成果物ありの場合、L1-L3がpassになること', () => {
    context('artifactScannerPortがL1-L3全てpresent=trueを返し、configQueryPortがstandardプリセットを返す場合', () => {
      it('L1・L2・L3のlastResult=passのHarnessStatusSummaryが返される', async () => {
        // Arrange
        deps.artifactScannerPort.scan.mockResolvedValue(makeFullScanResult());
        deps.configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'standard',
          enabledLayers: ['L1', 'L2', 'L3'],
        });
        deps.configQueryPort.getConfigSummary.mockResolvedValue({
          configPath: 'phasegate.config.json',
          lastModified: '2026-03-19T00:00:00.000Z',
          version: '2',
        });
        deps.configQueryPort.getPhaseGateSummary.mockResolvedValue({
          totalStories: 0,
          passedStories: 0,
          pendingStories: 0,
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        expect(actual.getLayerHealth('L1')?.lastResult).toBe('pass');
        expect(actual.getLayerHealth('L2')?.lastResult).toBe('pass');
        expect(actual.getLayerHealth('L3')?.lastResult).toBe('pass');
        expect(actual.getLayerHealth('L4')?.enabled).toBe(false);
      });
    });
  });

  // ─── IT-UC-DeriveStatus-002 ───
  describe('strictプリセットでL4も有効な場合、L4のlastResultが評価されること', () => {
    context('artifactScannerPortがL1-L4全てpresent=trueを返し、configQueryPortがstrictプリセットを返す場合', () => {
      it('L1・L2・L3・L4全てのlastResult=passのHarnessStatusSummaryが返される', async () => {
        // Arrange
        const scanResult = ArtifactScanResult.create({
          scannedPaths: [],
          foundArtifacts: [
            { layer: 'L1', present: true },
            { layer: 'L2', present: true },
            { layer: 'L3', present: true },
            { layer: 'L4', present: true },
          ],
          derivedLayerHealth: [],
        });
        deps.artifactScannerPort.scan.mockResolvedValue(scanResult);
        deps.configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'strict',
          enabledLayers: ['L1', 'L2', 'L3', 'L4'],
        });
        deps.configQueryPort.getConfigSummary.mockResolvedValue({
          configPath: 'phasegate.config.json',
          lastModified: '2026-03-19T00:00:00.000Z',
          version: '2',
        });
        deps.configQueryPort.getPhaseGateSummary.mockResolvedValue({
          totalStories: 0,
          passedStories: 0,
          pendingStories: 0,
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        expect(actual.getLayerHealth('L4')?.enabled).toBe(true);
        expect(actual.getLayerHealth('L4')?.lastResult).toBe('pass');
      });
    });
  });

  // ─── IT-UC-DeriveStatus-003 ───
  describe('minimalプリセットでL2-L4がdisabledになること', () => {
    context('configQueryPortがminimalプリセットを返す場合', () => {
      it('L1のみenabled=true、L2-L4はenabled=falseのHarnessStatusSummaryが返される', async () => {
        // Arrange
        const scanResult = ArtifactScanResult.create({
          scannedPaths: [],
          foundArtifacts: [{ layer: 'L1', present: true }],
          derivedLayerHealth: [],
        });
        deps.artifactScannerPort.scan.mockResolvedValue(scanResult);
        deps.configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'minimal',
          enabledLayers: ['L1'],
        });
        deps.configQueryPort.getConfigSummary.mockResolvedValue({
          configPath: 'phasegate.config.json',
          lastModified: '2026-03-19T00:00:00.000Z',
          version: '2',
        });
        deps.configQueryPort.getPhaseGateSummary.mockResolvedValue({
          totalStories: 0,
          passedStories: 0,
          pendingStories: 0,
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        expect(actual.getLayerHealth('L1')?.enabled).toBe(true);
        expect(actual.getLayerHealth('L2')?.enabled).toBe(false);
        expect(actual.getLayerHealth('L3')?.enabled).toBe(false);
        expect(actual.getLayerHealth('L4')?.enabled).toBe(false);
      });
    });
  });

  // ─── IT-UC-DeriveStatus-004 ───
  describe('L3成果物なしの場合、L3のlastResult=unknownになること', () => {
    context('artifactScannerPortがL3のpresent=falseを返す場合', () => {
      it('L3のlastResult=unknownのHarnessStatusSummaryが返される', async () => {
        // Arrange
        const scanResult = ArtifactScanResult.create({
          scannedPaths: [],
          foundArtifacts: [
            { layer: 'L1', present: true },
            { layer: 'L2', present: true },
            { layer: 'L3', present: false },
          ],
          derivedLayerHealth: [],
        });
        deps.artifactScannerPort.scan.mockResolvedValue(scanResult);
        deps.configQueryPort.getPresetInfo.mockResolvedValue({
          name: 'standard',
          enabledLayers: ['L1', 'L2', 'L3'],
        });
        deps.configQueryPort.getConfigSummary.mockResolvedValue({
          configPath: 'phasegate.config.json',
          lastModified: '2026-03-19T00:00:00.000Z',
          version: '2',
        });
        deps.configQueryPort.getPhaseGateSummary.mockResolvedValue({
          totalStories: 0,
          passedStories: 0,
          pendingStories: 0,
        });

        // Act
        const actual = await useCase.execute({});

        // Assert
        expect(actual.getLayerHealth('L3')?.lastResult).toBe('unknown');
      });
    });
  });

  // ─── IT-UC-DeriveStatus-005 ───
  describe('ArtifactScannerPortがエラーをスローした場合、HarnessApiDomainErrorがスローされること', () => {
    context('artifactScannerPort.scan()がエラーをスローする場合', () => {
      it('HarnessApiDomainErrorメッセージを含むエラーがスローされる', async () => {
        // Arrange
        deps.artifactScannerPort.scan.mockRejectedValue(new Error('disk read error'));

        // Act & Assert
        await expect(useCase.execute({})).rejects.toThrow('HarnessApiDomainError');
      });
    });
  });

  // ─── IT-UC-DeriveStatus-006 ───
  describe('ConfigQueryPortがエラーをスローした場合、HarnessApiDomainErrorがスローされること', () => {
    context('configQueryPort.getPresetInfo()がエラーをスローする場合', () => {
      it('HarnessApiDomainErrorメッセージを含むエラーがスローされる', async () => {
        // Arrange
        deps.artifactScannerPort.scan.mockResolvedValue(makeFullScanResult());
        deps.configQueryPort.getPresetInfo.mockRejectedValue(new Error('config not found'));

        // Act & Assert
        await expect(useCase.execute({})).rejects.toThrow('HarnessApiDomainError');
      });
    });
  });
});
