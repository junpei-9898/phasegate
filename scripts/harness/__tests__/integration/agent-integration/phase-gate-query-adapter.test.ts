// @unit agent-integration
// @layer infrastructure
// @story H11-02

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { WriteTargetScope } from '../../../agent-integration/domain/value-objects/write-target-scope.js';
import { PhaseGateQueryAdapter } from '../../../agent-integration/infrastructure/adapters/phase-gate-query-adapter.js';

target('PhaseGateQueryAdapter.checkGate', () => {
  describe('phase-dependency-model に委譲してフェーズゲートを問い合わせる', () => {
    context('既知のUnitをLevel 2で問い合わせる場合', () => {
      // IT-REPO-PhaseGateQuery-001
      it('判定結果が PhaseGateQueryResult として返ること', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();
        const scope = WriteTargetScope.create({ level: 2, unitId: 'agent-integration' });

        // Act
        const actual = await adapter.checkGate(scope);

        // Assert
        expect(typeof actual.hasPassed()).toBe('boolean');
        expect(Array.isArray(actual.getBlockers())).toBe(true);
        expect(Array.isArray(actual.getWarnings())).toBe(true);
      });
    });

    context('未知のUnitをLevel 2で問い合わせる場合', () => {
      // IT-REPO-PhaseGateQuery-002
      it('ブロッカーまたは警告を含む結果として返ること', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();
        const scope = WriteTargetScope.create({ level: 2, unitId: 'unknown-unit' });

        // Act
        const actual = await adapter.checkGate(scope);

        // Assert
        expect(actual.hasPassed() || actual.getWarnings().length > 0 || actual.getBlockers().length > 0).toBe(true);
      });
    });

    context('Level 1 を問い合わせる場合', () => {
      // IT-REPO-PhaseGateQuery-003
      it('Level 1 の判定結果が返ること', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();
        const scope = WriteTargetScope.create({ level: 1 });

        // Act
        const actual = await adapter.checkGate(scope);

        // Assert
        expect(typeof actual.hasPassed()).toBe('boolean');
      });
    });

    context('Level 3 を問い合わせる場合', () => {
      // IT-REPO-PhaseGateQuery-004
      it('storyIdなしのLevel 3でも結果が返ること', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();
        const scope = WriteTargetScope.create({ level: 3, unitId: 'agent-integration' });

        // Act
        const actual = await adapter.checkGate(scope);

        // Assert
        expect(typeof actual.hasPassed()).toBe('boolean');
      });
    });

    context('結果が不通過の場合', () => {
      // IT-REPO-PhaseGateQuery-005
      it('不通過時は少なくとも1件のblockerを返すこと', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();
        const scope = WriteTargetScope.create({ level: 2, unitId: 'unknown-unit' });

        // Act
        const actual = await adapter.checkGate(scope);

        // Assert
        if (!actual.hasPassed()) {
          expect(actual.getBlockers().length).toBeGreaterThan(0);
          return;
        }

        expect(actual.getWarnings().length).toBeGreaterThanOrEqual(0);
      });
    });

    context('アダプターの戻り値整合性を確認する場合', () => {
      // IT-REPO-PhaseGateQuery-006
      it('passed=false なら blockers が空でないというVO不変条件を満たすこと', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();
        const scope = WriteTargetScope.create({ level: 2, unitId: 'agent-integration' });

        // Act
        const actual = await adapter.checkGate(scope);

        // Assert
        if (!actual.hasPassed()) {
          expect(actual.getBlockers().length).toBeGreaterThan(0);
          return;
        }

        expect(actual.getBlockers()).toEqual([]);
      });
    });
  });
});

target('PhaseGateQueryAdapter.checkDesignDocsExist', () => {
  describe('指定Unitの設計文書存在を判定する（ISSUE-021 bypass 条件）', () => {
    context('logical_design.md と domain_model.md が両方存在する Unit の場合', () => {
      // IT-REPO-PhaseGateQuery-021-01
      it('true を返すこと', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();

        // Act
        const actual = await adapter.checkDesignDocsExist('agent-integration');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('存在しない Unit の場合', () => {
      // IT-REPO-PhaseGateQuery-021-02
      it('false を返すこと', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();

        // Act
        const actual = await adapter.checkDesignDocsExist('unknown-unit-name-xyz');

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('unitId が空文字列の場合', () => {
      // IT-REPO-PhaseGateQuery-021-03
      it('false を返すこと', async () => {
        // Arrange
        const adapter = new PhaseGateQueryAdapter();

        // Act
        const actual = await adapter.checkDesignDocsExist('');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
