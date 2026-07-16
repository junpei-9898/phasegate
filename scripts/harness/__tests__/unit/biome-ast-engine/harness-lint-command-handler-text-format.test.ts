// @unit biome-ast-engine
// @layer test
// @story WI-266
import { describe, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { HarnessLintCommandHandler } from '../../../biome-ast-engine/presentation/cli/harness-lint-command-handler.js';
import type { HarnessErrorPayloadItem } from '../../../biome-ast-engine/application/dto/build-harness-error-payload-output.js';

const createErrors = (count: number): HarnessErrorPayloadItem[] =>
  Array.from({ length: count }, (_, i) => ({
    code: `L1-00${(i % 8) + 1}`,
    severity: 'error' as const,
    message: `違反 ${i + 1}`,
    suggestion: '修正してください',
  }));

const createHandler = (errors: readonly HarnessErrorPayloadItem[]) =>
  new HarnessLintCommandHandler({
    executeLintUseCase: {
      execute: vi.fn().mockResolvedValue({
        report: { violations: [] },
        checkedFiles: [],
      }),
    },
    verifyEslintRemovalUseCase: {
      execute: vi.fn().mockResolvedValue({
        hasLegacyArtifacts: false,
        configFiles: [],
        packageDependencies: [],
      }),
    },
    buildHarnessErrorPayloadUseCase: {
      execute: vi.fn().mockResolvedValue({ errors }),
    },
  });

target('HarnessLintCommandHandler プレーンテキスト formatter (WI-266: violation 過少表示修正)', () => {
  context('違反件数が表示上限(3件)を超える場合', () => {
    it('列挙は先頭3件のみだが省略行に正確な総数を明示する', async () => {
      // Arrange
      const handler = createHandler(createErrors(11));

      // Act
      const actual = await handler.execute([]);

      // Assert
      const enumeratedLines = actual.text
        .split('\n')
        .filter((line) => line.trimStart().startsWith('[error]'));
      expect(enumeratedLines).toHaveLength(3);
      expect(actual.text).toContain('11 violation(s):');
      expect(actual.text).toContain('... and 8 more (shown 3 of 11)');
    });

    it('省略行の総数は列挙件数ではなく真の違反総数と一致する', async () => {
      // Arrange
      const handler = createHandler(createErrors(11));

      // Act
      const actual = await handler.execute([]);

      // Assert
      expect(actual.text).not.toContain('3 violation(s):');
      expect(actual.text).toContain('shown 3 of 11');
    });
  });

  context('違反件数が表示上限(3件)以下の場合', () => {
    it('全件を列挙し省略行を出力しない', async () => {
      // Arrange
      const handler = createHandler(createErrors(3));

      // Act
      const actual = await handler.execute([]);

      // Assert
      const enumeratedLines = actual.text
        .split('\n')
        .filter((line) => line.trimStart().startsWith('[error]'));
      expect(enumeratedLines).toHaveLength(3);
      expect(actual.text).toContain('3 violation(s):');
      expect(actual.text).not.toContain('more');
    });
  });

  context('違反が存在しない場合', () => {
    it('違反なしメッセージを出力し省略行を含まない', async () => {
      // Arrange
      const handler = createHandler([]);

      // Act
      const actual = await handler.execute([]);

      // Assert
      expect(actual.text).toContain('No violations found');
      expect(actual.text).not.toContain('more');
    });
  });
});
