// @layer test
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import type { ViolationFormatterPort } from '../../../biome-ast-engine/domain/ports/violation-formatter-port.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { RuleViolation } from '../../../biome-ast-engine/domain/value-objects/rule-violation.js';
import { BuildHarnessErrorPayloadUseCase } from '../../../biome-ast-engine/application/usecases/build-harness-error-payload-usecase.js';

const createViolation = (ruleName: string) =>
  RuleViolation.create({
    filePath: FilePath.fromWorkspaceRelative(`biome-ast-engine/${ruleName}.ts`),
    line: 1,
    column: 1,
    ruleName: RuleName.fromString(ruleName),
    message: `${ruleName} violation`,
    severity: 'error',
  });

const createSut = () => {
  const violationFormatterPort: ViolationFormatterPort = {
    format: vi.fn().mockImplementation(async (violations: readonly RuleViolation[]) =>
      violations.map((violation) => ({
        code: 'WRONG-CODE',
        severity: violation.severity,
        message: violation.message,
        suggestion: `${violation.ruleName.toString()} suggestion`,
      }))
    ),
  };

  return {
    violationFormatterPort,
    sut: new BuildHarnessErrorPayloadUseCase({
      violationFormatterPort,
    }),
  };
};

target('BuildHarnessErrorPayloadUseCase.execute', () => {
  describe('RuleViolationをHarnessError相当のDTOへ変換する', () => {
    context('8種類のRuleViolationを渡す場合', () => {
      it('L1-001からL1-008までのコード割当が固定される', async () => {
        // Arrange
        const { sut, violationFormatterPort } = createSut();
        const violations = [
          createViolation('require-unit-comment'),
          createViolation('require-layer-comment'),
          createViolation('no-layer-violation'),
          createViolation('enforce-folder-structure'),
          createViolation('no-any-abuse'),
          createViolation('no-code-duplication'),
          createViolation('no-ghost-file'),
          createViolation('no-comment-flood'),
        ] as const;

        // Act
        const actual = await sut.execute({ violations });

        // Assert
        expect(violationFormatterPort.format).toHaveBeenCalledWith(violations);
        expect(actual.errors.map((error) => error.code)).toEqual([
          'L1-001',
          'L1-002',
          'L1-003',
          'L1-004',
          'L1-005',
          'L1-006',
          'L1-007',
          'L1-008',
        ]);
      });
    });

    context('違反が0件の場合', () => {
      it('空配列のerrorsが返る', async () => {
        // Arrange
        const { sut } = createSut();

        // Act
        const actual = await sut.execute({ violations: [] });

        // Assert
        expect(actual.errors).toEqual([]);
      });
    });
  });
});
