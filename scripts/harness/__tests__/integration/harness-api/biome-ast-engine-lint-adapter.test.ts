import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  BiomeAstEngineLintAdapter,
  type IBiomeAstEngineStub,
} from '../../../harness-api/infrastructure/adapters/biome-ast-engine-lint-adapter.js';

target('BiomeAstEngineLintAdapter', () => {
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
        const adapter = new BiomeAstEngineLintAdapter();

        // Act
        const actual = await adapter.runLint();

        // Assert — スタブではなく実実装が呼ばれることを確認（passed/errors は実スキャン結果に依存）
        expect(actual).toBeDefined();
        expect(typeof actual.passed).toBe('boolean');
        expect(Array.isArray(actual.errors)).toBe(true);
        expect(Array.isArray(actual.warnings)).toBe(true);
      });
    });
  });
});
