// @layer test
// @unit regression-suite

import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { buildRegressionSuite } from '../../../regression-suite/composition-root.js';

target('regression-suite 出力先 (ISSUE-005 P2-7)', () => {
  context('buildRegressionSuite(baseDir) で組み立てた ciGateResultWriterPort', () => {
    it('baseDir 直下ではなく baseDir/reports/regression/ 配下に書き出す', async () => {
      // Arrange
      const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-p2-7-'));
      try {
        const suite = buildRegressionSuite(baseDir);
        // Act: writer ポートを直接叩いて出力を確認
        await (suite.configureCiGateUseCase as any); // keep tsc happy
        const summary = {
          passedCount: 1,
          failedCount: 0,
          skippedCount: 0,
          totalCount: 1,
          coverageRate: null,
          failures: [],
        } as any;
        // composition-root 経由で配線された writer を直接呼ぶ代わりに、
        // 実 UseCase を経由して書き出しを発生させる
        const mockDef = await import(
          '../../../regression-suite/domain/value-objects/regression-suite-definition.js'
        );
        const mockSuiteId = await import(
          '../../../regression-suite/domain/value-objects/suite-id.js'
        );
        const mockTest = await import(
          '../../../regression-suite/domain/value-objects/agent-independence-test.js'
        );
        const def = mockDef.RegressionSuiteDefinition.create({
          suiteId: mockSuiteId.SuiteId.create('agent-independence'),
          testCases: [
            mockTest.AgentIndependenceTest.create({
              targetModule: 'scripts/harness/main.ts',
              forbiddenPatterns: ['@anthropic-ai/claude-code'],
              allowedPaths: [],
            }),
          ],
          description: 'test',
        });
        // Inject the definition via a monkeypatch on the real port
        (suite as any).runAgentIndependenceGuardUseCase['suiteRegistryPort'] = {
          getDefinition: async () => def,
        };
        (suite as any).runAgentIndependenceGuardUseCase['importAnalyzerPort'] = {
          analyzeImports: async () => [],
        };
        await suite.runAgentIndependenceGuardUseCase.execute({ suiteId: 'agent-independence' });

        // Assert
        const expectedPath = path.join(baseDir, 'reports', 'regression', 'agent-independence-result.json');
        const s = await stat(expectedPath);
        expect(s.isFile()).toBe(true);
        const body = JSON.parse(await readFile(expectedPath, 'utf-8'));
        expect(body.suiteId).toBe('agent-independence');

        // baseDir 直下にはファイルが作られないこと
        await expect(stat(path.join(baseDir, 'agent-independence-result.json'))).rejects.toThrow();
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    }, 30000);
  });
});
