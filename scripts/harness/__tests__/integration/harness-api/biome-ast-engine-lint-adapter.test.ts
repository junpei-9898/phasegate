// @work-item-id WI-220
// @unit harness-api
// @story H11-01
// @layer test
// @work-item-id WI-311

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  BiomeAstEngineLintAdapter,
  type IBiomeAstEngineStub,
} from '../../../harness-api/infrastructure/adapters/biome-ast-engine-lint-adapter.js';
import { context, target } from '../../helpers/test-helpers.js';

const fixtureRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/harness-api/biome-lint-workspace',
);

target('BiomeAstEngineLintAdapter', () => {
  it.each([
    { targets: ['src/a.ts'], expected: ['src/a.ts', ''] },
    { targets: ['src/lib'], expected: ['src/lib/b.ts', ''] },
    { targets: [resolve(fixtureRoot, 'src/a.ts')], expected: ['src/a.ts', ''] },
    { targets: ['src/a.ts', 'src/lib'], expected: ['src/a.ts', 'src/lib/b.ts', ''] },
    { targets: [], expected: ['src/a.ts', 'src/lib/b.ts', 'src/library/c.ts', ''] },
  ])('報告対象 $targets だけを全体解析結果から返すこと', async ({ targets, expected }) => {
    // Arrange
    const paths = ['src/a.ts', 'src/lib/b.ts', 'src/library/c.ts', ''];
    const stub = { runLint: vi.fn().mockResolvedValue({ violations: paths.map((filePath) => ({
      filePath, line: 1, column: 1, ruleName: 'rule', message: filePath || 'global', severity: 'error',
    })) }) };
    const adapter = new BiomeAstEngineLintAdapter(stub, fixtureRoot);

    // Act
    const actual = await adapter.runLint(targets);

    // Assert
    expect(actual.errors.map((error) => error.message)).toEqual(expected.map((filePath) => `${filePath || 'global'} (${filePath}:1:1)`));
    expect(actual.passed).toBe(false);
    expect(stub.runLint).toHaveBeenCalledWith();
  });

  // ─── IT-Adapter-BiomeLint-001 ───
  describe('スタブが違反なしを返す場合、passed=trueが返されること', () => {
    context('stubが{violations:[]}を返す場合', () => {
      it('passed=true・errors=[]・warnings=[]が返される', async () => {
        // Arrange
        const stub: IBiomeAstEngineStub = {
          runLint: vi.fn().mockResolvedValue({ violations: [] }),
        };
        const adapter = new BiomeAstEngineLintAdapter(stub);

        // Act
        const actual = await adapter.runLint();

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toEqual([]);
        expect(actual.warnings).toEqual([]);
      });
    });
  });

  // ─── IT-Adapter-BiomeLint-002 ───
  describe('スタブがerror違反を返す場合、passed=falseになること', () => {
    context('stubがseverity=errorのRuleViolationを返す場合', () => {
      it('passed=false・errors.length=1・warnings=[]が返される', async () => {
        // Arrange
        const stub: IBiomeAstEngineStub = {
          runLint: vi.fn().mockResolvedValue({
            violations: [
              {
                filePath: 'src/test.ts',
                line: 10,
                column: 5,
                ruleName: 'no-unused-vars',
                message: 'unused variable',
                severity: 'error',
              },
            ],
          }),
        };
        const adapter = new BiomeAstEngineLintAdapter(stub);

        // Act
        const actual = await adapter.runLint();

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors).toHaveLength(1);
        expect(actual.errors[0].code).toBe('no-unused-vars');
        expect(actual.warnings).toEqual([]);
      });
    });
  });

  // ─── IT-Adapter-BiomeLint-003 ───
  describe('スタブがwarning違反を返す場合、passed=trueかつwarningsに追加されること', () => {
    context('stubがseverity=warningのRuleViolationを返す場合', () => {
      it('passed=true・errors=[]・warnings.length=1が返される', async () => {
        // Arrange
        const stub: IBiomeAstEngineStub = {
          runLint: vi.fn().mockResolvedValue({
            violations: [
              {
                filePath: 'src/test.ts',
                line: 20,
                column: 1,
                ruleName: 'prefer-const',
                message: 'use const instead',
                severity: 'warning',
              },
            ],
          }),
        };
        const adapter = new BiomeAstEngineLintAdapter(stub);

        // Act
        const actual = await adapter.runLint();

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toEqual([]);
        expect(actual.warnings).toHaveLength(1);
        expect(actual.warnings[0].code).toBe('prefer-const');
      });
    });
  });

  // ─── IT-Adapter-BiomeLint-004 ───
  describe('スタブ未指定（デフォルト）の場合、実際のbiome-ast-engineを呼び出すこと', () => {
    context('コンストラクタ引数なしで生成した場合', () => {
      it('実際のLintスキャンが実行され、結果オブジェクトが返される', async () => {
        // Arrange
        const adapter = new BiomeAstEngineLintAdapter(undefined, fixtureRoot);

        // Act
        const actual = await adapter.runLint();

        // Assert — host checkoutではなくtracked minimal fixtureを実実装でscanする
        expect(actual.passed).toBe(true);
        expect(actual.errors).toEqual([]);
        expect(actual.warnings).toEqual([]);
      });
    });
  });
});
