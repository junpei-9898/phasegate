// @layer test
// @unit phase-dependency-model
// @story H02-01
// @work-item-id WI-085
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { CheckPhaseGateUseCase } from '../../../phase-dependency-model/application/usecases/check-phase-gate-usecase.js';
import { EvidenceBundleAssembler } from '../../../phase-dependency-model/application/services/evidence-bundle-assembler.js';
import type { ArtifactExistenceCheckerPort } from '../../../phase-dependency-model/domain/ports/artifact-existence-checker-port.js';
import type { Artifact } from '../../../phase-dependency-model/domain/values/artifact.js';
import type { PhaseAuditLoggerPort } from '../../../phase-dependency-model/domain/ports/phase-audit-logger-port.js';
import type { PhaseConfigProviderPort } from '../../../phase-dependency-model/domain/ports/phase-config-provider-port.js';
import type { PlanDocumentReaderPort } from '../../../phase-dependency-model/domain/ports/plan-document-reader-port.js';
import { CustomRule } from '../../../phase-dependency-model/domain/values/custom-rule.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PhaseStructure } from '../../../phase-dependency-model/domain/models/phase-structure.js';
import { PlanEvidence } from '../../../phase-dependency-model/domain/values/plan-evidence.js';
import { PlanningMode } from '../../../phase-dependency-model/domain/values/planning-mode.js';

const createPolicy = (overrides?: Partial<{ rules: readonly CustomRule[]; overrideEnabled: boolean }>) =>
  PhaseCustomizationPolicy.create({
    rules: overrides?.rules ?? [],
    overrideEnabled: overrides?.overrideEnabled ?? false,
  });

const createRule = (targetPhase: string, action: readonly string[]) =>
  CustomRule.create({
    targetPhase,
    condition: 'requires-all',
    action,
  });

const createPlanEvidence = () =>
  PlanEvidence.create({
    exists: true,
    qaComplete: true,
    planningModeMatch: true,
  });

const createEvidencePorts = () => {
  const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
    checkAll: vi.fn().mockImplementation(async (artifacts: readonly Artifact[], scope: { unitId?: string; storyId?: string }) => {
      return new Map(artifacts.map((artifact: Artifact) => [artifact.resolve(scope), true]));
    }),
  };
  const planDocumentReader: PlanDocumentReaderPort = {
    readEvidence: vi.fn().mockResolvedValue(createPlanEvidence()),
  };

  return { artifactExistenceChecker, planDocumentReader };
};

target('CheckPhaseGateUseCase', () => {
  describe('execute', () => {
    context('override監査が不要なフェーズゲートを検証する場合', () => {
      it('Port呼び出し順序を保ちつつDTOを返すこと', async () => {
        // Arrange
        const policy = createPolicy();
        const { artifactExistenceChecker, planDocumentReader } = createEvidencePorts();
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(policy),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const auditLogger: PhaseAuditLoggerPort = {
          record: vi.fn(),
        };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new CheckPhaseGateUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          auditLogger,
        });

        // Act
        const actual = await sut.execute({
          targetLevel: 2,
          unitId: 'phase-dependency-model',
        });

        // Assert
        expect(actual).toEqual({
          passed: true,
          targetLevel: 2,
          blockers: [],
          warnings: [],
          auditRecorded: false,
        });
        expect(auditLogger.record).not.toHaveBeenCalled();
        expect((phaseConfigProvider.getCustomizationPolicy as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeLessThan(
          (phaseConfigProvider.getPlanningMode as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
        );
        expect((phaseConfigProvider.getPlanningMode as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeLessThan(
          (artifactExistenceChecker.checkAll as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
        );
        expect((artifactExistenceChecker.checkAll as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeLessThan(
          (planDocumentReader.readEvidence as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
        );
      });
    });

    // === ISSUE-001追加分 ===

    // IT-PD-103
    context('scope未提供でLevel 3を検証する場合', () => {
      it('Level 3のrequired=false成果物はスキップされpassed=trueを返すこと', async () => {
        // Arrange
        const policy = createPolicy();
        const { artifactExistenceChecker, planDocumentReader } = createEvidencePorts();
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(policy),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const auditLogger: PhaseAuditLoggerPort = { record: vi.fn() };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new CheckPhaseGateUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          auditLogger,
        });

        // Act
        const actual = await sut.execute({
          targetLevel: 3,
          unitId: 'phase-dependency-model',
        });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      });
    });

    // IT-PD-104
    context('scope.storyIdにUS IDを提供してLevel 3を検証する場合', () => {
      it('scope情報がcheckPhaseGateに転送されること', async () => {
        // Arrange
        const policy = createPolicy();
        const { artifactExistenceChecker, planDocumentReader } = createEvidencePorts();
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(policy),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const auditLogger: PhaseAuditLoggerPort = { record: vi.fn() };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new CheckPhaseGateUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          auditLogger,
        });

        // Act
        const actual = await sut.execute({
          targetLevel: 3,
          unitId: 'phase-dependency-model',
          storyId: 'H02-01',
        });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.targetLevel).toBe(3);
      });
    });

    // IT-PD-107
    context('scope.storyIdにissue IDを提供してLevel 3を検証する場合', () => {
      it('issue IDでもUS IDと同様にscope転送されpassed=trueを返すこと', async () => {
        // Arrange
        const policy = createPolicy();
        const { artifactExistenceChecker, planDocumentReader } = createEvidencePorts();
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(policy),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const auditLogger: PhaseAuditLoggerPort = { record: vi.fn() };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new CheckPhaseGateUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          auditLogger,
        });

        // Act
        const actual = await sut.execute({
          targetLevel: 3,
          unitId: 'phase-dependency-model',
          storyId: 'ISSUE-001',
        });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      });
    });

    // IT-PD-105
    context('scope.storyId提供時にLevel 3成果物が欠損している場合', () => {
      it('blockersが返されpassed=falseとなること', async () => {
        // Arrange
        const policy = createPolicy();
        const artifactExistenceChecker: ArtifactExistenceCheckerPort = {
          checkAll: vi.fn().mockImplementation(async (artifacts: readonly Artifact[], scope: { unitId?: string; storyId?: string }) => {
            const results = new Map<string, boolean>();
            for (const artifact of artifacts) {
              const resolved = artifact.resolve(scope);
              // Level 3 成果物は存在しない
              results.set(resolved, !resolved.includes('{storyId}') && !resolved.includes('H02-01'));
            }
            return results;
          }),
        };
        const planDocumentReader: PlanDocumentReaderPort = {
          readEvidence: vi.fn().mockResolvedValue(createPlanEvidence()),
        };
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(policy),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const auditLogger: PhaseAuditLoggerPort = { record: vi.fn() };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new CheckPhaseGateUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          auditLogger,
        });

        // Act
        const actual = await sut.execute({
          targetLevel: 3,
          unitId: 'phase-dependency-model',
          storyId: 'H02-01',
        });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.blockers.length).toBeGreaterThan(0);
      });
    });

    context('override監査が必要なフェーズゲートを検証する場合', () => {
      it('監査ログを分離して記録しauditRecorded=trueを返すこと', async () => {
        // Arrange
        const policy = createPolicy({
          overrideEnabled: true,
          rules: [createRule('2:unit-test-logic-designer', ['1:unit-designer'])],
        });
        const { artifactExistenceChecker, planDocumentReader } = createEvidencePorts();
        const phaseConfigProvider: PhaseConfigProviderPort = {
          getCustomizationPolicy: vi.fn().mockResolvedValue(policy),
          getPlanningMode: vi.fn().mockResolvedValue(PlanningMode.create('interactive')),
          getReportingOutputDir: vi.fn(),
          getStoryReflectionConfig: vi.fn(),
          getPathRoots: vi.fn().mockResolvedValue({
            designDocsRoot: 'docs/product/construction',
            inceptionDocsRoot: 'docs/inception',
          }),
        };
        const auditLogger: PhaseAuditLoggerPort = {
          record: vi.fn(),
        };
        const evidenceBundleAssembler = new EvidenceBundleAssembler({
          artifactExistenceChecker,
          planDocumentReader,
          phaseConfigProvider,
        });
        const sut = new CheckPhaseGateUseCase({
          phaseConfigProvider,
          evidenceBundleAssembler,
          auditLogger,
        });

        // Act
        const actual = await sut.execute({
          targetLevel: 3,
          unitId: 'phase-dependency-model',
          storyId: 'H02-01',
        });

        // Assert
        expect(actual.auditRecorded).toBe(true);
        expect(auditLogger.record).toHaveBeenCalledTimes(1);
        expect(auditLogger.record).toHaveBeenCalledWith({
          scope: {
            unitId: 'phase-dependency-model',
            storyId: 'H02-01',
          },
          targetLevel: 3,
          appliedRules: ['1:unit-designer->2:unit-test-logic-designer'],
          generatedAt: expect.any(String),
          requestedOverride: true,
        });
      });
    });
  });
});
