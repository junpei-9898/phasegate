// @layer test
// @unit biome-ast-engine
// @story H01-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessErrorFormatterAdapter } from '../../../biome-ast-engine/infrastructure/adapters/harness-error-formatter-adapter.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { RuleViolation } from '../../../biome-ast-engine/domain/value-objects/rule-violation.js';

const createViolation = (ruleName: string, message: string): RuleViolation =>
  RuleViolation.create({
    filePath: FilePath.fromWorkspaceRelative('src/domain/example.ts'),
    line: 1,
    column: 1,
    ruleName: RuleName.fromString(ruleName),
    message,
    severity: 'error',
  });

target('HarnessErrorFormatterAdapter.format', () => {
  describe('RuleViolationをHarnessError出力へ整形する', () => {
    context('require-unit-commentがカスタムmetadata tag名を含む場合', () => {
      it('suggestionにも設定タグ名が使われる', async () => {
        // Arrange
        const sut = new HarnessErrorFormatterAdapter();
        const violations = Object.freeze([
          createViolation('require-unit-comment', '@moduleコメントが必要です'),
        ]);

        // Act
        const actual = await sut.format(violations);

        // Assert
        expect(actual[0].suggestion).toBe('ファイル先頭に @module コメントを追加する');
      });
    });

    context('require-layer-commentがカスタムmetadata tag名を含む場合', () => {
      it('suggestionにも設定タグ名が使われる', async () => {
        // Arrange
        const sut = new HarnessErrorFormatterAdapter();
        const violations = Object.freeze([
          createViolation('require-layer-comment', '@tierコメントが必要です'),
        ]);

        // Act
        const actual = await sut.format(violations);

        // Assert
        expect(actual[0].suggestion).toBe('ファイル先頭に @tier コメントを追加する');
      });
    });
  });
});
