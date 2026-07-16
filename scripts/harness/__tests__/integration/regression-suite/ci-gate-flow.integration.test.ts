// @unit regression-suite
// @layer infrastructure
// @story H15-02
import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { buildRegressionSuite } from '../../../regression-suite/composition-root.js';

target('CI ゲート化統合フロー（実配線）', () => {
  // IT-FLOW-CiGate-001
  describe('ConfigureCiGateUseCase が実 ConfigQuery と連携して CiGateConfig を生成すること', () => {
    context('coverageThreshold=90・4 スイートを requiredSuiteIds に指定する場合', () => {
      it('ConfigureCiGateOutput.coverageThreshold=90・requiredSuiteIds.length=4', async () => {
        // Arrange
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-cigate-flow-'));
        try {
          const suite = buildRegressionSuite(baseDir);

          // Act
          const actual = await suite.configureCiGateUseCase.execute({
            requiredSuiteIds: ['k-requirements', 'gng-gate', 'agent-independence', 'v0-migration'],
            coverageThreshold: 90,
            executionMode: 'parallel',
          });

          // Assert
          expect(actual.coverageThreshold).toBe(90);
          expect(actual.requiredSuiteIds).toHaveLength(4);
          expect(actual.requiredSuiteIds).toContain('v0-migration');
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  // IT-FLOW-CiGate-002
  describe('coverageThreshold 未指定時に実 ConfigQuery の既定値が CiGateConfig に反映されること', () => {
    context('coverageThreshold を指定せず requiredSuiteIds のみ指定する場合', () => {
      it('ConfigureCiGateOutput.coverageThreshold=90（HarnessConfigQueryAdapter の既定値）', async () => {
        // Arrange
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-cigate-default-'));
        try {
          const suite = buildRegressionSuite(baseDir);

          // Act
          const actual = await suite.configureCiGateUseCase.execute({
            requiredSuiteIds: ['k-requirements'],
            executionMode: 'parallel',
          });

          // Assert
          expect(actual.coverageThreshold).toBe(90);
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      });
    });
  });
});
