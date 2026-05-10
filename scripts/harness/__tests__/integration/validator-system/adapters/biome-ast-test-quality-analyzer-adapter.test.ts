/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 * @work-item-id WI-129
 * @work-item-id WI-130
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { BiomeAstTestQualityAnalyzerAdapter } from '../../../../validator-system/infrastructure/adapters/biome-ast-test-quality-analyzer-adapter.js';

target('BiomeAstTestQualityAnalyzerAdapter', () => {
  async function writeTestFile(name: string, content: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'phasegate-test-quality-'));
    const filePath = join(directory, name);
    await writeFile(filePath, content);
    return filePath;
  }

  describe('analyzeTestFiles', () => {
    context('単一ファイルパスを指定した場合', () => {
      it('results[0].passed=trueかつviolations=[]が返る（stub実装） (IT-REPO-TestQuality-001)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/valid.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results[0].passed).toBe(true);
        expect(actual.results[0].violations).toEqual([]);
      });
    });

    context('複数ファイルパスを指定した場合', () => {
      it('全ファイルの結果が返る (IT-REPO-TestQuality-002)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/file1.test.ts', 'tests/file2.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results.map((result) => result.filePath)).toEqual(input);
      });
    });

    context('違反なしのファイルを複数渡した場合', () => {
      it('全ファイルのpassed=trueが返る (IT-REPO-TestQuality-003)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/a.test.ts', 'tests/b.test.ts', 'tests/c.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results.every((r) => r.passed === true)).toBe(true);
      });
    });

    context('結果にfilePathが含まれる場合', () => {
      it('results[0].filePathが入力パスと一致する (IT-REPO-TestQuality-004)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = 'tests/target.test.ts';
        const input = [filePath] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results[0].filePath).toBe(filePath);
      });
    });

    context('targetPathsが空の場合', () => {
      it('results=[]が返る (IT-REPO-TestQuality-005)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = [] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results).toEqual([]);
      });
    });

    context('violations配列の型チェック', () => {
      it('results[0].violationsはArrayである (IT-REPO-TestQuality-006)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/sample.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual.results[0].violations).toEqual([]);
      });
    });

    context('返却型の確認', () => {
      it('resultsプロパティを含むオブジェクトが返る (IT-REPO-TestQuality-007)', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const input = ['tests/sample.test.ts'] as readonly string[];

        // Act
        const actual = await adapter.analyzeTestFiles(input);

        // Assert
        expect(actual).toHaveProperty('results');
        expect(Array.isArray(actual.results)).toBe(true);
      });
    });

    context('semantic AAA構造を持つTypeScriptテストを解析する場合', () => {
      it('test case単位のAAAとactual観測が通過すること', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = await writeTestFile('valid.test.ts', `
          import { it, expect } from 'vitest';
          it('有効な入力なら成功を返すこと', () => {
            const input = 'valid';
            const actual = input.toUpperCase();
            expect(actual).toBe('VALID');
          });
        `);

        // Act
        const actual = await adapter.analyzeTestFiles([filePath]);

        // Assert
        expect(actual.results[0].passed).toBe(true);
        expect(actual.results[0].violations).toEqual([]);
      });
    });

    context('semantic AAA構造が崩れているTypeScriptテストを解析する場合', () => {
      it('複数ActとAct以外へのAssertをtest case単位で検出すること', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = await writeTestFile('multi-act.test.ts', `
          import { it, expect } from 'vitest';
          it('入力を2回処理すること', () => {
            const input = 'valid';
            const actual = input.toUpperCase();
            const second = input.toLowerCase();
            expect(input).toBe('valid');
          });
        `);

        // Act
        const actual = await adapter.analyzeTestFiles([filePath]);

        // Assert
        const messages = actual.results[0].violations.map((violation) => violation.message);
        expect(actual.results[0].passed).toBe(false);
        expect(messages.some((message) => message.includes('Act が複数あります'))).toBe(true);
        expect(messages.some((message) => message.includes('Assert が Act の観測結果を検証していません'))).toBe(true);
      });
    });

    context('domain/internal dependencyをmockしている場合', () => {
      it('runner-specific APIに閉じずdomain mock違反を検出すること', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = await writeTestFile('domain-mock.test.ts', `
          import { it, expect, vi } from 'vitest';
          vi.mock('../domain/aggregates/invoice');
          it('請求金額を計算すること', () => {
            const input = { amount: 100 };
            const actual = input.amount * 2;
            expect(actual).toBe(200);
          });
        `);

        // Act
        const actual = await adapter.analyzeTestFiles([filePath]);

        // Assert
        expect(actual.results[0].passed).toBe(false);
        expect(actual.results[0].violations.some((violation) => (
          violation.message.includes('domain/internal dependency を mock')
        ))).toBe(true);
      });
    });

    context('lifecycle/E2E例外として複数Actを扱う場合', () => {
      it('E2E lifecycle testでは複数Actを許可すること', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = await writeTestFile('order.e2e.test.ts', `
          import { it, expect } from 'vitest';
          it('注文ライフサイクルを一連の手順で完了できること', () => {
            const input = { id: 'order-1' };
            const actual = createOrder(input);
            expect(actual.status).toBe('created');
            const updated = payOrder(actual);
            expect(updated.status).toBe('paid');
          });
          function createOrder(input: { id: string }) { return { ...input, status: 'created' }; }
          function payOrder(input: { id: string }) { return { ...input, status: 'paid' }; }
        `);

        // Act
        const actual = await adapter.analyzeTestFiles([filePath]);

        // Assert
        expect(actual.results[0].passed).toBe(true);
      });
    });

    context('parameterized testを解析する場合', () => {
      it('it.each形式のAAA構造を通過させること', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = await writeTestFile('parameterized.test.ts', `
          import { it, expect } from 'vitest';
          it.each([['a', 'A']])('値を大文字化できること', (input, expected) => {
            const prefix = 'case';
            const actual = input.toUpperCase();
            expect(actual).toBe(expected);
          });
        `);

        // Act
        const actual = await adapter.analyzeTestFiles([filePath]);

        // Assert
        expect(actual.results[0].passed).toBe(true);
      });
    });

    context('弱いassertionを解析する場合', () => {
      it('truthiness、snapshot、length、interaction、error contract不足をwarningに分類すること', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter();
        const filePath = await writeTestFile('weak-assertions.test.ts', `
          import { it, expect } from 'vitest';
          it('弱い観測だけでは成功扱いにしないこと', () => {
            const input = ['a'];
            const actual = input.map((value) => value.toUpperCase());
            expect(actual).toBeTruthy();
            expect(actual).toMatchSnapshot();
            expect(actual).toHaveLength(1);
            expect(service.execute).toHaveBeenCalledTimes(1);
            expect(() => { throw new Error('boom'); }).toThrow();
          });
        `);

        // Act
        const actual = await adapter.analyzeTestFiles([filePath]);

        // Assert
        const messages = actual.results[0].violations.map((violation) => violation.message);
        expect(actual.results[0].passed).toBe(false);
        expect(messages.some((message) => message.includes('weak-truthiness'))).toBe(true);
        expect(messages.some((message) => message.includes('snapshot-only'))).toBe(true);
        expect(messages.some((message) => message.includes('length-only'))).toBe(true);
        expect(messages.some((message) => message.includes('interaction-only'))).toBe(true);
        expect(messages.some((message) => message.includes('error contract'))).toBe(true);
      });

      it('weak assertion policyをconstructor optionで差し替えられること', async () => {
        // Arrange
        const adapter = new BiomeAstTestQualityAnalyzerAdapter({
          weakAssertionStrengths: ['snapshot-only'],
        });
        const filePath = await writeTestFile('configured-weak-assertions.test.ts', `
          import { it, expect } from 'vitest';
          it('truthinessを許容してsnapshotだけを弱い観測として扱うこと', () => {
            const input = ['a'];
            const actual = input.map((value) => value.toUpperCase());
            expect(actual).toBeTruthy();
            expect(actual).toMatchSnapshot();
          });
        `);

        // Act
        const actual = await adapter.analyzeTestFiles([filePath]);

        // Assert
        const messages = actual.results[0].violations.map((violation) => violation.message);
        expect(actual.results[0].passed).toBe(false);
        expect(messages.some((message) => message.includes('snapshot-only'))).toBe(true);
        expect(messages.some((message) => message.includes('weak-truthiness'))).toBe(false);
      });
    });
  });
});
