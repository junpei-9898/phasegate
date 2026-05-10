// @layer test
// @unit validator-system
// @story H08-01
import { describe } from 'vitest';

/**
 * テスト対象のメソッド/クラスを示すdescribeエイリアス
 */
export const target = describe;

/**
 * テストの前提条件を示すdescribeエイリアス
 */
export const context = describe;

// ---- validator-system ファクトリ関数 ----

import { ValidatorId } from '../../validator-system/domain/value-objects/validator-id.js';
import { ValidationRule, type ValidationRuleProps } from '../../validator-system/domain/value-objects/validation-rule.js';
import { ValidatorDefinition, type ValidatorDefinitionProps } from '../../validator-system/domain/value-objects/validator-definition.js';
import { ValidationResult } from '../../validator-system/domain/value-objects/validation-result.js';
import { LayerConfig, type LayerConfigProps } from '../../validator-system/domain/value-objects/layer-config.js';
import { DriftReport, type DriftReportProps } from '../../validator-system/domain/value-objects/drift-report.js';
import { ValidatorRegistry } from '../../validator-system/domain/services/validator-registry.js';

export const createValidatorId = (value = 'L2-001') =>
  ValidatorId.create(value);

export const createValidationRule = (overrides: Partial<ValidationRuleProps> = {}): ValidationRule =>
  ValidationRule.create({
    ruleName: 'aaa-pattern',
    errorTemplate: {
      code: 'L2-001',
      severity: 'error',
      messageTemplate: 'AAAパターン違反: {{location}}',
    },
    fixExample: null,
    ...overrides,
  });

export const createValidatorDefinition = (overrides: Partial<ValidatorDefinitionProps> = {}): ValidatorDefinition => {
  const validatorId = overrides.validatorId ?? createValidatorId('L2-001');
  const layer = overrides.layer ?? 'L2';
  return ValidatorDefinition.create({
    validatorId,
    layer,
    rules: [createValidationRule()],
    enabledCondition: 'always',
    externalPolicyRef: null,
    ...overrides,
  });
};

export const createValidationResult = (): ValidationResult =>
  ValidationResult.pass(createValidatorId('L2-001'), 100);

export const createLayerConfig = (overrides: Partial<LayerConfigProps> = {}): LayerConfig =>
  LayerConfig.create({
    layer: 'L2',
    enabled: true,
    validatorIds: ['L2-001', 'L2-002', 'L2-003', 'L2-014'],
    thresholds: {},
    strictOnly: false,
    preset: 'standard',
    ...overrides,
  });

export const createDriftReport = (overrides: Partial<DriftReportProps> = {}): DriftReport =>
  DriftReport.create({
    direction: 'design→code',
    unitName: 'validator-system',
    element: 'ValidatorId',
    description: '設計に存在するがコードに存在しない',
    ...overrides,
  });

export const createHarnessError = () => ({
  code: { value: 'L2-001', toString: () => 'L2-001' },
  severity: { value: 'error', toString: () => 'error' },
  message: 'テスト用エラー',
  suggestion: 'テスト用提案',
});

export const createValidatorRegistry = (defs?: ValidatorDefinition[]): ValidatorRegistry => {
  const definitions = defs ?? [
    createValidatorDefinition({ validatorId: createValidatorId('L2-001'), layer: 'L2' }),
    createValidatorDefinition({ validatorId: createValidatorId('L2-002'), layer: 'L2' }),
    createValidatorDefinition({ validatorId: createValidatorId('L2-003'), layer: 'L2' }),
    createValidatorDefinition({ validatorId: createValidatorId('L2-014'), layer: 'L2' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-001'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-002'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-003'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L3-004'), layer: 'L3' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-001'), layer: 'L4' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-002'), layer: 'L4' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-003'), layer: 'L4' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-004'), layer: 'L4' }),
    createValidatorDefinition({ validatorId: createValidatorId('L4-005'), layer: 'L4' }),
  ];
  return new ValidatorRegistry(definitions);
};

// ---- quick-mode ファクトリ関数 ----

import { ChangedFile } from '../../quick-mode/domain/value-objects/changed-file.js';
import { QuickModeConfig } from '../../quick-mode/domain/value-objects/quick-mode-config.js';
import { QuickModeEligibility } from '../../quick-mode/domain/value-objects/quick-mode-eligibility.js';
import { ValidatorRelaxationProfile } from '../../quick-mode/domain/value-objects/validator-relaxation-profile.js';
import { QuickModeDecision } from '../../quick-mode/domain/value-objects/quick-mode-decision.js';

export const createChangedFile = (
  filePath = 'scripts/harness/quick-mode/services/quick-service.ts',
  changeKind: 'CREATE' | 'MODIFY' | 'DELETE' = 'MODIFY'
): ChangedFile => ChangedFile.create({ filePath, changeKind });

export const createQuickModeConfig = (overrides: Partial<{
  allowedCategories: string[];
  maintainedLayers: string[];
  relaxedGates: string[];
  fullModeRequiredWhen: {
    mixedCategories: boolean;
    newDomainFile: boolean;
    apiContractChange: boolean;
  };
}> = {}): QuickModeConfig =>
  QuickModeConfig.create({
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L2-014', 'L3-001'],
    relaxedGates: ['L2-001'],
    ...overrides,
  });

export const createQuickModeEligibility = (eligible = true): QuickModeEligibility =>
  eligible
    ? QuickModeEligibility.eligible('allowedCategories内のみ')
    : QuickModeEligibility.rejected(
        'MIXED_CHANGES',
        [createChangedFile('scripts/harness/quick-mode/domain/service.ts', 'MODIFY')],
        'domain カテゴリが含まれる'
      );

export const createValidatorRelaxationProfile = (): ValidatorRelaxationProfile =>
  ValidatorRelaxationProfile.createDefault();

export const createQuickModeDecision = (approved = true): QuickModeDecision =>
  approved
    ? QuickModeDecision.approved(createQuickModeEligibility(true), createValidatorRelaxationProfile())
    : QuickModeDecision.rejected(createQuickModeEligibility(false));

// ---- nyquist-validation ファクトリ関数 ----

import { TestReference } from '../../nyquist-validation/domain/value-objects/test-reference.js';
import { AcMapping } from '../../nyquist-validation/domain/value-objects/ac-mapping.js';
import { CoverageResult } from '../../nyquist-validation/domain/value-objects/coverage-result.js';
import { StoryMapping } from '../../nyquist-validation/domain/entities/story-mapping.js';
import { RequirementTestMatrix } from '../../nyquist-validation/domain/aggregates/requirement-test-matrix.js';

export const createTestReference = (overrides: Partial<{ filePath: string; testType: string }> = {}) =>
  TestReference.create({
    filePath: 'scripts/harness/__tests__/unit/foo.test.ts',
    testType: 'unit',
    ...overrides,
  });

export const createAcMapping = (
  acId = 'AC-1',
  refs: TestReference[] = [createTestReference()]
) => AcMapping.create({ acId, testReferences: refs });

export const createStoryMapping = (
  storyId = 'H07-01',
  acMappings: AcMapping[] = [createAcMapping()]
) => StoryMapping.create({ storyId, acMappings });

export const createRequirementTestMatrix = (
  storyMappings: StoryMapping[] = [createStoryMapping()]
) => RequirementTestMatrix.create({ storyMappings });

export const createCoverageResult = (
  overrides: Partial<{ rate: number; coveredAcCount: number; totalAcCount: number; uncoveredAcIds: string[] }> = {}
) =>
  CoverageResult.create({
    rate: 1.0,
    coveredAcCount: 1,
    totalAcCount: 1,
    uncoveredAcIds: [],
    ...overrides,
  });

// ---- agent-integration ファクトリ関数 ----

import { PreToolUseEvent } from '../../agent-integration/domain/value-objects/hook-event.js';
import { PostToolUseEvent } from '../../agent-integration/domain/value-objects/hook-event.js';
import { StopEvent } from '../../agent-integration/domain/value-objects/hook-event.js';
import { ProtectedFileList } from '../../agent-integration/domain/value-objects/protected-file-list.js';
import { HookTranslationResult } from '../../agent-integration/domain/value-objects/hook-translation-result.js';
import { FallbackCapabilitySpec } from '../../agent-integration/domain/value-objects/fallback-capability-spec.js';
import { ProjectPaths } from '../../agent-integration/domain/value-objects/project-paths.js';
import { WriteTargetScope } from '../../agent-integration/domain/value-objects/write-target-scope.js';

export const createPreToolUseEvent = (
  overrides: Partial<{ hookType: string; toolName: string; targetFilePaths: string[] }> = {}
) =>
  PreToolUseEvent.create({
    hookType: 'pre-tool-use',
    toolName: 'Write',
    targetFilePaths: ['src/app.ts'],
    ...overrides,
  } as { hookType: 'pre-tool-use'; toolName: string; targetFilePaths: string[] });

export const createPostToolUseEvent = (
  overrides: Partial<{ hookType: string; toolName: string; affectedFilePaths: string[] }> = {}
) =>
  PostToolUseEvent.create({
    hookType: 'post-tool-use',
    toolName: 'Write',
    affectedFilePaths: ['src/app.ts'],
    ...overrides,
  } as { hookType: 'post-tool-use'; toolName: string; affectedFilePaths: string[] });

export const createStopEvent = (sessionId = 'sess-001') =>
  StopEvent.create({ hookType: 'stop', sessionId });

export const createProtectedFileList = (patterns: string[] = ['biome.json', 'tsconfig.json']) =>
  ProtectedFileList.create({ patterns });

export const createHookTranslationResult = (
  overrides: Partial<{
    shouldBlock: boolean;
    cliCommand: string;
    cliArgs: string[];
    expectedExitCode: number;
    skipReason: 'REENTRY_DETECTED' | 'HOOK_DISABLED' | 'TIMEOUT_EXCEEDED';
    timeoutMs: number;
  }> = {}
) =>
  HookTranslationResult.create({
    shouldBlock: false,
    cliArgs: [],
    expectedExitCode: 0,
    ...overrides,
  });

export const createFallbackCapabilitySpec = (
  overrides: Partial<{ supportedCommands: string[]; noAgentApiImports: boolean }> = {}
) =>
  FallbackCapabilitySpec.create({
    supportedCommands: ['phasegate:lint'],
    noAgentApiImports: true,
    ...overrides,
  });

export const createProjectPaths = (overrides?: Partial<{
  source: string[];
  docs: { construction: string; inception: string };
}>) =>
  ProjectPaths.create(
    overrides?.source ?? ['scripts/harness'],
    overrides?.docs ?? { construction: 'docs/product/construction', inception: 'docs/inception' },
  );

export const createWriteTargetScope = (overrides: {
  level: 1 | 2 | 3;
  unitId?: string;
  storyId?: string;
}) =>
  WriteTargetScope.create({
    level: overrides.level,
    unitId: overrides.unitId,
    storyId: overrides.storyId,
  });

// ---- ci-governance ファクトリ関数 ----

import { vi } from 'vitest';
import { TemplateConfig } from '../../ci-governance/domain/value-objects/template-config.js';
import { EscalationAction } from '../../ci-governance/domain/value-objects/escalation-action.js';
import { RepetitionResetCondition } from '../../ci-governance/domain/value-objects/repetition-reset-condition.js';
import { PointerEntry } from '../../ci-governance/domain/value-objects/pointer-entry.js';
import { CiTemplate } from '../../ci-governance/domain/aggregates/ci-template.js';
import { ErrorRepetition } from '../../ci-governance/domain/aggregates/error-repetition.js';
import { AgentsMdPointer } from '../../ci-governance/domain/aggregates/agents-md-pointer.js';
import type { LessonArtifact } from '../../ci-governance/domain/types/lesson-artifact.js';

export const createTemplateConfig = (overrides: Partial<{
  targetValidatorIds: string[];
  triggerCondition: 'pull_request' | 'schedule' | 'pre-commit';
  failOnWarning: boolean;
}> = {}): TemplateConfig =>
  TemplateConfig.create({
    targetValidatorIds: ['v1'],
    triggerCondition: 'pull_request',
    failOnWarning: false,
    ...overrides,
  });

export const createEscalationAction = (overrides: Partial<{
  logLevel: 'warn' | 'error';
  messageTemplate: string;
}> = {}): EscalationAction =>
  EscalationAction.create({
    logLevel: 'warn',
    messageTemplate: 'Error {errorCode} occurred {count} times',
    ...overrides,
  });

export const createRepetitionResetCondition = (resetOnResolution = true): RepetitionResetCondition =>
  RepetitionResetCondition.create({ resetOnResolution });

export const createCommandPointerEntry = (overrides: Partial<{
  key: string;
  command: string;
  description: string;
}> = {}): PointerEntry =>
  PointerEntry.createCommand({
    key: 'cmd-status',
    command: 'phasegate:status',
    description: 'ステータス確認コマンド',
    ...overrides,
  });

export const createFilePointerEntry = (overrides: Partial<{
  key: string;
  filePath: string;
  description: string;
}> = {}): PointerEntry =>
  PointerEntry.createFile({
    key: 'file-readme',
    filePath: 'docs/README.md',
    description: 'READMEファイル',
    ...overrides,
  });

export const createLessonArtifact = (overrides: Partial<{
  lessonId: string;
  source: string;
  content: string;
  tags: string[];
  timestamp: string;
}> = {}): LessonArtifact => ({
  lessonId: '550e8400-e29b-41d4-a716-446655440001',
  source: 'story-implementor',
  content: 'ドメインサービスは状態を持たず、ポート経由のみでI/Oを行うこと',
  tags: ['best-practice'] as any,
  timestamp: '2026-03-20T00:00:00Z',
  ...overrides,
});

export const createCiTemplate = (overrides: Partial<{
  templateType: 'aidlc-gate' | 'consistency-check' | 'pre-commit';
  presetRef: string;
}> = {}): CiTemplate =>
  CiTemplate.create(
    overrides.templateType ?? 'aidlc-gate',
    overrides.presetRef ?? 'standard',
  );

export const createConfiguredCiTemplate = (overrides: Partial<{
  templateType: 'aidlc-gate' | 'consistency-check' | 'pre-commit';
  presetRef: string;
  targetValidatorIds: string[];
}> = {}): CiTemplate => {
  const template = createCiTemplate(overrides);
  const config = createTemplateConfig({
    targetValidatorIds: overrides.targetValidatorIds ?? ['v1'],
  });
  return template.withConfig(config);
};

export const createErrorRepetition = (overrides: Partial<{
  code: string;
  threshold: number;
}> = {}): ErrorRepetition =>
  ErrorRepetition.create(
    overrides.code ?? 'L1-001',
    overrides.threshold,
  );

export const createAgentsMdPointer = (overrides: Partial<{
  pointers: PointerEntry[];
  adrLinks: string[];
}> = {}): AgentsMdPointer =>
  AgentsMdPointer.create(
    overrides.pointers ?? [],
    overrides.adrLinks ?? [],
  );

export const createValidatorIdRegistryPortMock = (validatorIds = ['v1', 'v2']) => ({
  listAll: vi.fn().mockResolvedValue(validatorIds),
});

export const createPresetConfigPortMock = (failOnWarning = false) => ({
  getPreset: vi.fn().mockResolvedValue({ failOnWarning }),
});

export const createErrorRepetitionRepositoryPortMock = (existing: ErrorRepetition | null = null) => ({
  findByCode: vi.fn().mockResolvedValue(existing),
  save: vi.fn().mockResolvedValue(undefined),
});

export const createCommandExistencePortMock = (exists = true) => ({
  exists: vi.fn().mockResolvedValue(exists),
});

export const createFileExistencePortMock = (exists = true) => ({
  exists: vi.fn().mockResolvedValue(exists),
});

export const createAdrExistencePortMock = (exists = true) => ({
  exists: vi.fn().mockResolvedValue(exists),
});
