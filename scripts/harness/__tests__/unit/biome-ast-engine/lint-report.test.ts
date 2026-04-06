// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { RuleViolation } from '../../../biome-ast-engine/domain/value-objects/rule-violation.js';
import { LintReport } from '../../../biome-ast-engine/domain/value-objects/lint-report.js';

const createFilePath = (value = 'biome-ast-engine/domain/example.ts'): FilePath =>
  FilePath.fromWorkspaceRelative(value);
const createRuleName = (value = 'require-unit-comment'): RuleName => RuleName.fromString(value);

const createRuleViolation = (overrides?: {
  readonly severity?: 'error' | 'warning';
  readonly ruleName?: RuleName;
}): RuleViolation =>
  RuleViolation.create({
    filePath: createFilePath(),
    line: 1,
    column: 1,
    ruleName: overrides?.ruleName ?? createRuleName(),
    message: 'message',
    severity: overrides?.severity ?? 'error',
    fixExample: null,
  });

const createLintReport = (overrides?: {
  readonly violations?: readonly RuleViolation[];
  readonly passedRules?: readonly RuleName[];
  readonly skippedRules?: readonly RuleName[];
  readonly durationMs?: number;
  readonly scannedFiles?: number;
}): LintReport =>
  LintReport.create({
    violations: overrides?.violations ?? Object.freeze([]),
    passedRules: overrides?.passedRules ?? Object.freeze([]),
    skippedRules: overrides?.skippedRules ?? Object.freeze([]),
    durationMs: overrides?.durationMs ?? 10,
    scannedFiles: overrides?.scannedFiles ?? 2,
  });

target('LintReport.create', () => {
  describe('レポートを生成する', () => {
    context('正常な属性値の場合', () => {
      it('LintReportが生成される', () => {
        // Arrange
        const props = {
          violations: Object.freeze([
            createRuleViolation({ severity: 'error' }),
            createRuleViolation({ severity: 'warning', ruleName: createRuleName('no-any-abuse') }),
          ]),
          passedRules: Object.freeze([]),
          skippedRules: Object.freeze([]),
          durationMs: 10,
          scannedFiles: 2,
        };

        // Act
        const actual = LintReport.create(props);

        // Assert
        expect(actual.violationCount()).toBe(2);
      });
    });

    context('durationMsが負数の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createLintReport(),
          durationMs: -1,
        };

        // Act
        const actual = () => LintReport.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('scannedFilesが負数の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createLintReport(),
          scannedFiles: -1,
        };

        // Act
        const actual = () => LintReport.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('durationMs=0, scannedFiles=0の最小許容値の場合', () => {
      it('LintReportが生成される', () => {
        // Arrange
        const props = {
          ...createLintReport(),
          durationMs: 0,
          scannedFiles: 0,
        };

        // Act
        const actual = LintReport.create(props);

        // Assert
        expect(actual.durationMs).toBe(0);
        expect(actual.scannedFiles).toBe(0);
      });
    });
  });
});

target('LintReport.hasErrors', () => {
  describe('エラーの存在を判定する', () => {
    context('severity="error"の違反がある場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createLintReport({
          violations: Object.freeze([createRuleViolation({ severity: 'error' })]),
        });

        // Act
        const actual = sut.hasErrors();

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('severity="warning"の違反のみの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createLintReport({
          violations: Object.freeze([createRuleViolation({ severity: 'warning' })]),
        });

        // Act
        const actual = sut.hasErrors();

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('LintReport.errorCount', () => {
  describe('エラー件数を返す', () => {
    context('error2件warning1件の場合', () => {
      it('2が返される', () => {
        // Arrange
        const sut = createLintReport({
          violations: Object.freeze([
            createRuleViolation({ severity: 'error' }),
            createRuleViolation({ severity: 'error', ruleName: createRuleName('no-any-abuse') }),
            createRuleViolation({ severity: 'warning', ruleName: createRuleName('no-comment-flood') }),
          ]),
        });

        // Act
        const actual = sut.errorCount();

        // Assert
        expect(actual).toBe(2);
      });
    });
  });
});

target('LintReport.warningCount', () => {
  describe('warning件数を返す', () => {
    context('error2件warning1件の場合', () => {
      it('1が返される', () => {
        // Arrange
        const sut = createLintReport({
          violations: Object.freeze([
            createRuleViolation({ severity: 'error' }),
            createRuleViolation({ severity: 'error', ruleName: createRuleName('no-any-abuse') }),
            createRuleViolation({ severity: 'warning', ruleName: createRuleName('no-comment-flood') }),
          ]),
        });

        // Act
        const actual = sut.warningCount();

        // Assert
        expect(actual).toBe(1);
      });
    });

    context('warningの違反がない場合', () => {
      it('0が返される', () => {
        // Arrange
        const sut = createLintReport({
          violations: Object.freeze([
            createRuleViolation({ severity: 'error' }),
            createRuleViolation({ severity: 'error', ruleName: createRuleName('no-any-abuse') }),
          ]),
        });

        // Act
        const actual = sut.warningCount();

        // Assert
        expect(actual).toBe(0);
      });
    });
  });
});

target('LintReport.violationCount', () => {
  describe('全違反件数を返す', () => {
    context('error2件warning1件の場合', () => {
      it('3が返される', () => {
        // Arrange
        const sut = createLintReport({
          violations: Object.freeze([
            createRuleViolation({ severity: 'error' }),
            createRuleViolation({ severity: 'error', ruleName: createRuleName('no-any-abuse') }),
            createRuleViolation({ severity: 'warning', ruleName: createRuleName('no-comment-flood') }),
          ]),
        });

        // Act
        const actual = sut.violationCount();

        // Assert
        expect(actual).toBe(3);
      });
    });
  });
});
