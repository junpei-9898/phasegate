// @unit agent-integration
// @layer test

import { afterEach, describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { WriteTargetScope } from '../../../agent-integration/domain/value-objects/write-target-scope.js';
import { PhaseGateQueryAdapter } from '../../../agent-integration/infrastructure/adapters/phase-gate-query-adapter.js';

const createConfigFoundationModuleMock = vi.hoisted(() => vi.fn());

vi.mock('../../../config-foundation/composition-root.js', () => ({
  createConfigFoundationModule: createConfigFoundationModuleMock,
}));

target('PhaseGateQueryAdapter.checkGate (fail-closed)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createConfigFoundationModuleMock.mockReset();
  });

  describe('依存モジュールが例外を投げる場合', () => {
    context('config-foundation の解決が汎用エラーで失敗する場合', () => {
      it('通過扱い(passed=true)にせず、blockerを伴う不通過結果を返すこと', async () => {
        // Arrange
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        createConfigFoundationModuleMock.mockReturnValue({
          usecases: {
            loadResolvedConfigUseCase: {
              execute: vi.fn().mockRejectedValue(new Error('config load exploded')),
            },
          },
        });
        const adapter = new PhaseGateQueryAdapter();
        const scope = WriteTargetScope.create({ level: 2, unitId: 'agent-integration' });

        // Act
        const actual = await adapter.checkGate(scope);

        // Assert
        expect(actual.hasPassed()).toBe(false);
        expect(actual.getBlockers().length).toBeGreaterThan(0);
        expect(actual.getBlockers()[0]).toContain('config load exploded');
      });
    });
  });
});
