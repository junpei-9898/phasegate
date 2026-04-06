// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { RuleViolation } from '../../../biome-ast-engine/domain/value-objects/rule-violation.js';

const createFilePath = (value = 'biome-ast-engine/domain/example.ts'): FilePath =>
  FilePath.fromWorkspaceRelative(value);
const createRuleName = (value = 'require-unit-comment'): RuleName => RuleName.fromString(value);

const createRuleViolation = (overrides?: {
  readonly filePath?: FilePath;
  readonly line?: number;
  readonly column?: number;
  readonly ruleName?: RuleName;
  readonly message?: string;
  readonly severity?: 'error' | 'warning';
  readonly fixExample?: string | null;
}): RuleViolation =>
  RuleViolation.create({
    filePath: overrides?.filePath ?? createFilePath(),
    line: overrides?.line ?? 1,
    column: overrides?.column ?? 1,
    ruleName: overrides?.ruleName ?? createRuleName(),
    message: overrides?.message ?? 'message',
    severity: overrides?.severity ?? 'error',
    fixExample: overrides?.fixExample ?? null,
  });

target('RuleViolation.create', () => {
  describe('違反情報を生成する', () => {
    context('正常な属性値の場合', () => {
      it('RuleViolationが生成される', () => {
        // Arrange
        const props = {
          filePath: createFilePath(),
          line: 1,
          column: 1,
          ruleName: createRuleName(),
          message: 'message',
          severity: 'error' as const,
          fixExample: null,
        };

        // Act
        const actual = RuleViolation.create(props);

        // Assert
        expect(actual.toContract().ruleName).toBe(props.ruleName.toString());
        expect(actual.toContract().filePath).toBe(props.filePath.toString());
      });
    });

    context('lineが0の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createRuleViolation(),
          line: 0,
        };

        // Act
        const actual = () => RuleViolation.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('columnが0の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createRuleViolation(),
          column: 0,
        };

        // Act
        const actual = () => RuleViolation.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('messageが空文字の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createRuleViolation(),
          message: '',
        };

        // Act
        const actual = () => RuleViolation.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('line=1, column=1の最小許容値の場合', () => {
      it('RuleViolationが生成される', () => {
        // Arrange
        const props = {
          ...createRuleViolation(),
          line: 1,
          column: 1,
        };

        // Act
        const actual = RuleViolation.create(props);

        // Assert
        expect(actual.line).toBe(1);
        expect(actual.column).toBe(1);
      });
    });
  });
});

target('RuleViolation.withFixExample', () => {
  describe('修正例を追加した新インスタンスを返す', () => {
    context('fixExampleを指定した場合', () => {
      it('fixExampleが設定された新インスタンスが返される', () => {
        // Arrange
        const sut = createRuleViolation();

        // Act
        const actual = sut.withFixExample('// fixed');

        // Assert
        expect(actual.toContract().fix_example).toBe('// fixed');
        expect(sut === actual).toBe(false);
      });
    });
  });
});

target('RuleViolation.toContract', () => {
  describe('契約形式に変換する', () => {
    context('fixExampleがある場合', () => {
      it('fix_exampleを含むオブジェクトが返される', () => {
        // Arrange
        const sut = createRuleViolation().withFixExample('// fixed');

        // Act
        const actual = sut.toContract();

        // Assert
        expect(actual.fix_example).toBe('// fixed');
      });
    });

    context('fixExampleがない場合', () => {
      it('fix_exampleを含まないオブジェクトが返される', () => {
        // Arrange
        const sut = createRuleViolation();

        // Act
        const actual = sut.toContract();

        // Assert
        expect('fix_example' in actual).toBe(false);
      });
    });
  });
});

target('RuleViolation.equals', () => {
  describe('等価性を判定する', () => {
    context('同一属性のRuleViolationの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createRuleViolation();
        const right = createRuleViolation();

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('異なる属性のRuleViolationの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const left = createRuleViolation();
        const right = createRuleViolation({ line: 2 });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
