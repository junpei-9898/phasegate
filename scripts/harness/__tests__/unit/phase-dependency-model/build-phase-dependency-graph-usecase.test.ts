// @layer test
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { BuildPhaseDependencyGraphUseCase } from '../../../phase-dependency-model/application/usecases/build-phase-dependency-graph-usecase.js';
import type { PhaseConfigProviderPort } from '../../../phase-dependency-model/domain/ports/phase-config-provider-port.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';

const createPhaseConfigProvider = (): PhaseConfigProviderPort => ({
  getCustomizationPolicy: vi.fn().mockResolvedValue(
    PhaseCustomizationPolicy.create({
      rules: [],
      overrideEnabled: false,
    }),
  ),
  getPlanningMode: vi.fn(),
  getReportingOutputDir: vi.fn(),
  getStoryReflectionConfig: vi.fn(),
});

target('BuildPhaseDependencyGraphUseCase', () => {
  describe('execute', () => {
    context('includeArtifactsを指定しない場合', () => {
      it('成果物パスを含めない依存グラフDTOを返すこと', async () => {
        // Arrange
        const phaseConfigProvider = createPhaseConfigProvider();
        const sut = new BuildPhaseDependencyGraphUseCase({
          phaseConfigProvider,
        });

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual.nodes.length).toBeGreaterThan(0);
        expect(actual.edges.length).toBeGreaterThan(0);
        expect(actual.nodes[0]).not.toHaveProperty('artifacts');
      });
    });

    context('includeArtifacts=trueを指定する場合', () => {
      it('成果物パスを含む依存グラフDTOを返すこと', async () => {
        // Arrange
        const phaseConfigProvider = createPhaseConfigProvider();
        const sut = new BuildPhaseDependencyGraphUseCase({
          phaseConfigProvider,
        });

        // Act
        const actual = await sut.execute({
          includeArtifacts: true,
        });

        // Assert
        expect(actual.nodes.some((node) => Array.isArray(node.artifacts) && node.artifacts.length > 0)).toBe(true);
        expect(actual.edges.some((edge) => edge.type === 'requires')).toBe(true);
      });
    });
  });
});
