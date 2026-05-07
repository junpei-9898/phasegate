// @layer test
// @unit phase-dependency-model
// @story H02-01
// @work-item-id WI-085
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { EvidenceBundleAssembler } from '../../../phase-dependency-model/application/services/evidence-bundle-assembler.js';
import type { ArtifactExistenceCheckerPort } from '../../../phase-dependency-model/domain/ports/artifact-existence-checker-port.js';
import type { Artifact } from '../../../phase-dependency-model/domain/values/artifact.js';
import type { PhaseConfigProviderPort } from '../../../phase-dependency-model/domain/ports/phase-config-provider-port.js';
import type { PlanDocumentReaderPort } from '../../../phase-dependency-model/domain/ports/plan-document-reader-port.js';
import { PhaseStructure } from '../../../phase-dependency-model/domain/models/phase-structure.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PlanEvidence } from '../../../phase-dependency-model/domain/values/plan-evidence.js';
import { PlanningMode } from '../../../phase-dependency-model/domain/values/planning-mode.js';

const createPolicy = () =>
  PhaseCustomizationPolicy.create({
    rules: [],
    overrideEnabled: false,
  });

const createPlanEvidence = (overrides?: Partial<{ exists: boolean; qaComplete: boolean; planningModeMatch: boolean }>) =>
  PlanEvidence.create({
    exists: true,
    qaComplete: true,
    planningModeMatch: true,
    ...overrides,
  });

target('EvidenceBundleAssembler', () => {
  describe('assembleForLevel', () => {
    context('plan成果物を持つノード群を収集する場合', () => {
      it('成果物存在結果とplan証跡とPlanning Modeを束ねること', async () => {
        // Arrange
        const structure = PhaseStructure.createDefault(createPolicy());
        const nodes = structure.getPhaseNodes(PhaseLevel.create(1));
        const planningMode = PlanningMode.create('interactive');
        const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
          checkAll: vi.fn().mockImplementation(async (artifacts: readonly Artifact[], scope: { unitId?: string; storyId?: string }) => {
            return new Map(artifacts.map((artifact: Artifact) => [artifact.resolve(scope), true]));
          }),
        };
        const planDocumentReader: PlanDocumentReaderPort = {
          readEvidence: vi.fn().mockResolvedValue(createPlanEvidence()),
        };
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getPlanningMode: vi.fn().mockResolvedValue(planningMode),
          getCustomizationPolicy: vi.fn(),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const sut = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });

        // Act
        const actual = await sut.assembleForLevel(PhaseLevel.create(2), nodes, {
          unitId: 'phase-dependency-model',
        });

        // Assert
        expect(phaseConfigProvider.getPlanningMode).toHaveBeenCalledWith({
          unitId: 'phase-dependency-model',
        });
        expect(artifactExistenceChecker.checkAll).toHaveBeenCalledWith(
          nodes.flatMap((node) => node.artifacts),
          { unitId: 'phase-dependency-model' },
          { designDocsRoot: 'docs/product/construction', inceptionDocsRoot: 'docs/inception' },
        );
        expect(planDocumentReader.readEvidence).toHaveBeenCalledTimes(nodes.length);
        expect(actual.planningMode.equals(planningMode)).toBe(true);
        expect(actual.artifactStatuses.get(nodes[0].artifacts[0].path)).toBe(true);
        expect(actual.planEvidences.get(nodes[0].nodeKey())?.equals(createPlanEvidence())).toBe(true);
      });
    });

    context('plan成果物を持たないノードを収集する場合', () => {
      it('plan文書リーダーを呼ばずに空のplan証跡を返すこと', async () => {
        // Arrange
        const structure = PhaseStructure.createDefault(createPolicy());
        const nodes = structure
          .getPhaseNodes(PhaseLevel.create(3))
          .filter((node) => node.skillName === 'implementation-readiness-checker');
        const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
          checkAll: vi.fn().mockResolvedValue(new Map()),
        };
        const planDocumentReader: PlanDocumentReaderPort = {
          readEvidence: vi.fn(),
        };
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getCustomizationPolicy: vi.fn(),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const sut = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });

        // Act
        const actual = await sut.assembleForLevel(PhaseLevel.create(3), nodes, {
          unitId: 'phase-dependency-model',
          storyId: 'H02-01',
        });

        // Assert
        expect(artifactExistenceChecker.checkAll).toHaveBeenCalledWith(
          [],
          { unitId: 'phase-dependency-model', storyId: 'H02-01' },
          { designDocsRoot: 'docs/product/construction', inceptionDocsRoot: 'docs/inception' },
        );
        expect(planDocumentReader.readEvidence).not.toHaveBeenCalled();
        expect([...actual.planEvidences.keys()]).toEqual([]);
      });
    });

    // IT-PD-123
    context('カスタム paths 設定時', () => {
      it('Artifact.resolve がカスタム root で展開される（WI-085）', async () => {
        // Arrange
        const structure = PhaseStructure.createDefault(createPolicy());
        const nodes = structure.getPhaseNodes(PhaseLevel.create(2));
        const customPathRoots = {
          designDocsRoot: 'mydocs/product',
          inceptionDocsRoot: 'mydocs/inception',
        };
        const planEvidence = createPlanEvidence();
        const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
          checkAll: vi.fn().mockResolvedValue(new Map()),
        };
        const planDocumentReader: PlanDocumentReaderPort = {
          readEvidence: vi.fn().mockResolvedValue(planEvidence),
        };
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getCustomizationPolicy: vi.fn(),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue(customPathRoots),
        };
        const sut = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });

        // Act
        const actual = await sut.assembleForLevel(PhaseLevel.create(2), nodes, {
          unitId: 'phase-dependency-model',
        });

        // Assert
        expect(artifactExistenceChecker.checkAll).toHaveBeenCalledWith(
          expect.any(Array),
          { unitId: 'phase-dependency-model' },
          customPathRoots,
        );
        expect(actual.pathRoots).toEqual(customPathRoots);
      });
    });

    // IT-PD-125
    context('assembleForLevel 内での getPathRoots 呼び出し回数', () => {
      it('1 回だけ呼ばれる（WI-085）', async () => {
        // Arrange
        const structure = PhaseStructure.createDefault(createPolicy());
        const nodes = structure.getPhaseNodes(PhaseLevel.create(2));
        const getPathRootsSpy = vi.fn().mockResolvedValue({
          designDocsRoot: 'docs/product/construction',
          inceptionDocsRoot: 'docs/inception',
        });
        const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
          checkAll: vi.fn().mockResolvedValue(new Map()),
        };
        const planDocumentReader: PlanDocumentReaderPort = {
          readEvidence: vi.fn().mockResolvedValue(createPlanEvidence()),
        };
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getCustomizationPolicy: vi.fn(),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: getPathRootsSpy,
        };
        const sut = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });

        // Act
        await sut.assembleForLevel(PhaseLevel.create(2), nodes, {
          unitId: 'phase-dependency-model',
        });

        // Assert
        expect(getPathRootsSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
