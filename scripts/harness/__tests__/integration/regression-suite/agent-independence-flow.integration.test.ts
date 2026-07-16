// @unit regression-suite
// @layer infrastructure
// @story H14-02
import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { buildRegressionSuite } from '../../../regression-suite/composition-root.js';
import { RunAgentIndependenceGuardUseCase } from '../../../regression-suite/application/usecases/run-agent-independence-guard-usecase.js';
import { StaticSuiteRegistryAdapter } from '../../../regression-suite/infrastructure/adapters/static-suite-registry-adapter.js';
import { BiomeAstImportAnalyzerAdapter } from '../../../regression-suite/infrastructure/adapters/biome-ast-import-analyzer-adapter.js';
import { JsonCiGateResultWriterAdapter } from '../../../regression-suite/infrastructure/adapters/json-ci-gate-result-writer-adapter.js';
import { RegressionSuiteDefinition } from '../../../regression-suite/domain/value-objects/regression-suite-definition.js';
import { SuiteId } from '../../../regression-suite/domain/value-objects/suite-id.js';
import { AgentIndependenceTest } from '../../../regression-suite/domain/value-objects/agent-independence-test.js';
import type { SuiteRegistryPort } from '../../../regression-suite/domain/ports/suite-registry-port.js';

target('agent-independence 実行統合フロー（実配線）', () => {
  // IT-FLOW-AgentInteg-001
  describe('composition-root 経由で UseCase→ImportGuardService→ImportAnalyzer が連携し違反なしを判定すること', () => {
    context('禁止 import を含まない実ソースを対象とする既定スイートを実行する場合', () => {
      it('RunRegressionSuiteOutput.failedCount=0（実 domain サービスは禁止 import なしと判定）', async () => {
        // Arrange: composition-root は実 domain services（agent-independence 対象）を targetModule に持つ
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-agent-flow-'));
        try {
          const suite = buildRegressionSuite(baseDir);

          // Act
          const actual = await suite.runAgentIndependenceGuardUseCase.execute({ suiteId: 'agent-independence' });

          // Assert
          expect(actual.failedCount).toBe(0);
          expect(actual.failures).toEqual([]);
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      }, 30000);
    });
  });

  // IT-FLOW-AgentInteg-002
  describe('実 ImportAnalyzer が禁止 import を検出したとき TestFailureDetail まで伝播すること', () => {
    context('禁止パッケージを実際に import する実ファイルを targetModule に指定する場合', () => {
      it("failures[0].errorMessage に '@anthropic-ai/claude-code' が含まれ failedCount=1 になること", async () => {
        // Arrange: 実ファイルに禁止 import を書き込み、実 adapter に実解析させる
        const baseDir = await mkdtemp(path.join(tmpdir(), 'phasegate-wi277-agent-violation-'));
        const targetModule = path.join(baseDir, 'violating-module.ts');
        try {
          await writeFile(targetModule, "import { x } from '@anthropic-ai/claude-code';\nexport const y = x;\n", 'utf-8');

          const definition = RegressionSuiteDefinition.create({
            suiteId: SuiteId.create('agent-independence'),
            testCases: [
              AgentIndependenceTest.create({
                targetModule,
                forbiddenPatterns: ['@anthropic-ai/claude-code'],
                allowedPaths: [],
              }),
            ],
            description: '実違反検証用スイート',
          });
          const suiteRegistryPort: SuiteRegistryPort = { getDefinition: async () => definition };
          const useCase = new RunAgentIndependenceGuardUseCase(
            suiteRegistryPort,
            new BiomeAstImportAnalyzerAdapter(),
            new JsonCiGateResultWriterAdapter(path.join(baseDir, 'reports')),
          );

          // Act
          const actual = await useCase.execute({ suiteId: 'agent-independence' });

          // Assert
          expect(actual.failedCount).toBe(1);
          expect(actual.failures[0].errorMessage).toContain('@anthropic-ai/claude-code');
        } finally {
          await rm(baseDir, { recursive: true, force: true });
        }
      }, 30000);
    });
  });
});
