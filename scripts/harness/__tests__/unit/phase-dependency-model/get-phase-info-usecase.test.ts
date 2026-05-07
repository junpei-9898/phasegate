// @layer test
// @unit phase-dependency-model
// @story H02-01
// @work-item-id WI-085
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { GetPhaseInfoUseCase } from '../../../phase-dependency-model/application/usecases/get-phase-info-usecase.js';
import { EvidenceBundleAssembler } from '../../../phase-dependency-model/application/services/evidence-bundle-assembler.js';
import { PhaseInfoResolver } from '../../../phase-dependency-model/application/services/phase-info-resolver.js';
import type { ArtifactExistenceCheckerPort } from '../../../phase-dependency-model/domain/ports/artifact-existence-checker-port.js';
import type { Artifact } from '../../../phase-dependency-model/domain/values/artifact.js';
import type { PhaseConfigProviderPort } from '../../../phase-dependency-model/domain/ports/phase-config-provider-port.js';
import type { PlanDocumentReaderPort } from '../../../phase-dependency-model/domain/ports/plan-document-reader-port.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';
import { PhaseStructure } from '../../../phase-dependency-model/domain/models/phase-structure.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PlanEvidence } from '../../../phase-dependency-model/domain/values/plan-evidence.js';
import { PlanningMode } from '../../../phase-dependency-model/domain/values/planning-mode.js';

const createPolicy = () =>
  PhaseCustomizationPolicy.create({
    rules: [],
    overrideEnabled: false,
  });

const createPlanEvidence = (completeNodeKeys: readonly string[]) => {
  const structure = PhaseStructure.createDefault(createPolicy());
  const graph = structure.buildDependencyGraph();

  return new Map(
    graph.nodes
      .filter((node) => node.planArtifacts().length > 0 && completeNodeKeys.includes(node.nodeKey()))
      .map((node) => [
        node.nodeKey(),
        PlanEvidence.create({
          exists: true,
          qaComplete: true,
          planningModeMatch: true,
        }),
      ] as const),
  );
};

target('GetPhaseInfoUseCase', () => {
  describe('execute', () => {
    context('Unit横断設計の前提だけが満たされている場合', () => {
      it('currentLevelとcompletedNodesとnextNodesを返すこと', async () => {
        // Arrange
        const level1NodeKeys = PhaseStructure.createDefault(createPolicy())
          .getPhaseNodes(PhaseLevel.create(1))
          .map((node) => node.nodeKey());
        const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
          checkAll: vi.fn().mockImplementation(async (artifacts: readonly Artifact[], scope: { unitId?: string; storyId?: string }) => {
            return new Map(
              artifacts.map((artifact: Artifact) => [
                artifact.resolve(scope),
                level1NodeKeys.some((nodeKey) => artifact.path.includes('_shared') || nodeKey === '1:unit-designer'),
              ]),
            );
          }),
        };
        const planDocumentReader: PlanDocumentReaderPort = {
          readEvidence: vi.fn().mockImplementation(async (node) => {
            return createPlanEvidence(level1NodeKeys).get(node.nodeKey()) ??
              PlanEvidence.create({
                exists: false,
                qaComplete: false,
                planningModeMatch: false,
              });
          }),
        };
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(createPolicy()),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new GetPhaseInfoUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          phaseInfoResolver: new PhaseInfoResolver(),
        });

        // Act
        const actual = await sut.execute({
          unitId: 'phase-dependency-model',
        });

        // Assert
        expect(actual.unitId).toBe('phase-dependency-model');
        expect(actual.currentLevel).toBe(2);
        expect(actual.completedNodes).toEqual(level1NodeKeys);
        expect(actual.nextNodes).toEqual(['2:domain-designer']);
        expect(actual.blockers.some((entry) => entry.includes('2:domain-designer'))).toBe(true);
      });
    });

    context('Story scopeでLevel 2まで完了している場合', () => {
      it('currentLevel=3を返すこと', async () => {
        // Arrange
        const structure = PhaseStructure.createDefault(createPolicy());
        const completedNodeKeys = [
          ...structure.getPhaseNodes(PhaseLevel.create(1)).map((node) => node.nodeKey()),
          ...structure.getPhaseNodes(PhaseLevel.create(2)).map((node) => node.nodeKey()),
        ];
        const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
          checkAll: vi.fn().mockImplementation(async (artifacts: readonly Artifact[], scope: { unitId?: string; storyId?: string }) => {
            return new Map(
              artifacts.map((artifact: Artifact) => [
                artifact.resolve(scope),
                !artifact.path.includes('{storyId}'),
              ]),
            );
          }),
        };
        const planDocumentReader: PlanDocumentReaderPort = {
          readEvidence: vi.fn().mockImplementation(async (node) => {
            return createPlanEvidence(completedNodeKeys).get(node.nodeKey()) ??
              PlanEvidence.create({
                exists: false,
                qaComplete: false,
                planningModeMatch: false,
              });
          }),
        };
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(createPolicy()),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new GetPhaseInfoUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          phaseInfoResolver: new PhaseInfoResolver(),
        });

        // Act
        const actual = await sut.execute({
          unitId: 'phase-dependency-model',
          storyId: 'H02-01',
        });

        // Assert
        expect(actual.storyId).toBe('H02-01');
        expect(actual.currentLevel).toBe(3);
        expect(actual.nextNodes).toEqual(['3:logical-designer']);
      });
    });
  });
});
