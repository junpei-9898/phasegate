// @unit agent-integration
// @layer application
// @story H11-02
// @work-item-id WI-201

import { describe, expect, it, vi } from 'vitest';
import { HandlePreToolUseUseCase } from '../../../agent-integration/application/usecases/handle-pre-tool-use-usecase.js';
import { PhaseGateQueryResult } from '../../../agent-integration/domain/value-objects/phase-gate-query-result.js';

function createDefaultMockConfigQueryPort() {
  return {
    isHookEnabled: vi.fn(),
    getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
    getRelaxedGates: vi.fn().mockResolvedValue([]),
    getProjectPaths: vi.fn().mockReturnValue({
      getSource: () => ['scripts/harness'],
      getDocsInception: () => 'docs/inception',
      getDocsConstruction: () => 'docs/product/construction',
    }),
    getBaselineConfig: vi.fn().mockResolvedValue({
      enabled: false,
      path: '.phasegate/baseline.json',
    }),
    getStopHookEnforce: vi.fn().mockResolvedValue(false),
  };
}

function createDefaultMockPhaseGateQueryPort() {
  return {
    checkGate: vi.fn().mockResolvedValue(PhaseGateQueryResult.create(true, [], [])),
    checkDesignDocsExist: vi.fn().mockResolvedValue(false),
  };
}

function createProtectedConfigQueryPort() {
  return {
    ...createDefaultMockConfigQueryPort(),
    getProtectedFilePatterns: vi.fn(async () => ['phasegate.config.json']),
  };
}

describe('HandlePreToolUseUseCase config-plan guidance', () => {
  it('phasegate.config.json の保護ファイルブロックは config plan の復旧手順を返すこと', async () => {
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createProtectedConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
    });
    const input = {
      toolName: 'Edit',
      targetFilePaths: ['phasegate.config.json'],
      targetChanges: undefined,
    };

    const actual = await useCase.execute(input);

    expect(actual).toMatchObject({
      shouldBlock: true,
      blockedFilePath: 'phasegate.config.json',
      blockReason: 'PROTECTED_FILE',
    });
    expect(actual.error?.message).toContain('config:plan --intent retrofit-bootstrap --dry-run --json');
    expect(actual.error?.message).toContain('config:plan --intent retrofit-bootstrap --apply --json');
  });

  it('phasegate.config.json の full-mode config ブロックは story 実装ではなく config plan 復旧を案内すること', async () => {
    const mockFullModeRequirementQueryPort = {
      check: vi.fn().mockResolvedValue({
        requiresFullMode: true,
        rejectionRule: 'MIXED_CHANGES' as const,
        rejectionReason: 'allowedCategories外のファイルが含まれています: phasegate.config.json',
        dominantCategory: 'config',
      }),
    };
    const useCase = new HandlePreToolUseUseCase({
      configQueryPort: createDefaultMockConfigQueryPort(),
      phaseGateQueryPort: createDefaultMockPhaseGateQueryPort(),
      fullModeRequirementQueryPort: mockFullModeRequirementQueryPort,
    });
    const input = {
      toolName: 'Edit',
      targetFilePaths: ['phasegate.config.json'],
      targetChanges: undefined,
    };

    const actual = await useCase.execute(input);

    expect(actual).toMatchObject({
      shouldBlock: true,
      blockedFilePath: 'phasegate.config.json',
      blockReason: 'FULL_MODE_REQUIRED',
      fullModeRejectionRule: 'MIXED_CHANGES',
      fullModeDominantCategory: 'config',
    });
    expect(actual.error?.message).toContain('config:plan --intent retrofit-bootstrap --dry-run --json');
    expect(actual.error?.message).toContain('config:plan --intent retrofit-bootstrap --apply --json');
    expect(actual.error?.message).not.toContain('/story-implementor');
  });
});
