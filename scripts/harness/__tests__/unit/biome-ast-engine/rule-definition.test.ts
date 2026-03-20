import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { RequiredInput } from '../../../biome-ast-engine/domain/value-objects/required-input.js';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { RuleType } from '../../../biome-ast-engine/domain/value-objects/rule-type.js';
import { RuleDefinition } from '../../../biome-ast-engine/domain/value-objects/rule-definition.js';

const createRuleName = (value = 'require-unit-comment'): RuleName => RuleName.fromString(value);
const createRuleType = (value: 'BiomeNative' | 'ExternalAnalyzer' = 'ExternalAnalyzer'): RuleType =>
  RuleType.fromString(value);
const createRequiredInput = (
  value: 'source-module-snapshots' | 'import-graph' | 'biome-diagnostics' | 'workspace-inventory' =
    'source-module-snapshots'
): RequiredInput => RequiredInput.fromString(value);

const createRuleDefinition = (overrides?: {
  readonly name?: RuleName;
  readonly type?: RuleType;
  readonly enabled?: boolean;
  readonly severity?: 'error' | 'warning';
  readonly supportsAutofix?: boolean;
  readonly requiredInputs?: readonly RequiredInput[];
  readonly config?: Readonly<Record<string, unknown>>;
  readonly errorCode?: string;
  readonly description?: string;
  readonly suggestion?: string;
}): RuleDefinition =>
  RuleDefinition.create({
    name: overrides?.name ?? createRuleName(),
    type: overrides?.type ?? createRuleType(),
    enabled: overrides?.enabled ?? true,
    severity: overrides?.severity ?? 'error',
    supportsAutofix: overrides?.supportsAutofix ?? false,
    requiredInputs: overrides?.requiredInputs ?? Object.freeze([createRequiredInput()]),
    config: overrides?.config ?? Object.freeze({}),
    errorCode: overrides?.errorCode ?? 'L1-001',
    description: overrides?.description ?? 'description',
    suggestion: overrides?.suggestion ?? 'suggestion',
  });

target('RuleDefinition.create', () => {
  describe('ルール定義を生成する', () => {
    context('正常な属性値の場合', () => {
      it('RuleDefinitionが生成される', () => {
        // Arrange
        const props = {
          name: createRuleName(),
          type: createRuleType(),
          enabled: true,
          severity: 'error' as const,
          supportsAutofix: false,
          requiredInputs: Object.freeze([createRequiredInput()]),
          config: Object.freeze({}),
          errorCode: 'L1-001',
          description: 'description',
          suggestion: 'suggestion',
        };

        // Act
        const actual = RuleDefinition.create(props);

        // Assert
        expect(actual.isEnabled()).toBe(true);
      });
    });

    context('errorCodeが"L1-001"の場合', () => {
      it('生成成功する', () => {
        // Arrange
        const props = {
          ...createRuleDefinition(),
          errorCode: 'L1-001',
        };

        // Act
        const actual = RuleDefinition.create(props);

        // Assert
        expect(actual.errorCode).toBe('L1-001');
      });
    });

    context('errorCodeが"L1-008"の場合', () => {
      it('生成成功する', () => {
        // Arrange
        const props = {
          ...createRuleDefinition(),
          errorCode: 'L1-008',
        };

        // Act
        const actual = RuleDefinition.create(props);

        // Assert
        expect(actual.errorCode).toBe('L1-008');
      });
    });

    context('errorCodeが"L1-000"の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createRuleDefinition(),
          errorCode: 'L1-000',
        };

        // Act
        const actual = () => RuleDefinition.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('errorCodeが"L1-009"の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createRuleDefinition(),
          errorCode: 'L1-009',
        };

        // Act
        const actual = () => RuleDefinition.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });

    context('errorCodeが"L2-001"の場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const props = {
          ...createRuleDefinition(),
          errorCode: 'L2-001',
        };

        // Act
        const actual = () => RuleDefinition.create(props);

        // Assert
        expect(actual).toThrow();
      });
    });
  });
});

target('RuleDefinition.withSeverity', () => {
  describe('severityを変更した新しいRuleDefinitionを返す', () => {
    context('"warning"に変更した場合', () => {
      it('severity="warning"の新インスタンスが返される', () => {
        // Arrange
        const sut = createRuleDefinition({ severity: 'error' });

        // Act
        const actual = sut.withSeverity('warning');

        // Assert
        expect(actual.severity).toBe('warning');
        expect(sut === actual).toBe(false);
      });
    });

    context('—', () => {
      it('元のインスタンスは変更されない', () => {
        // Arrange
        const sut = createRuleDefinition({ severity: 'error' });

        // Act
        const actual = sut.withSeverity('warning');

        // Assert
        expect(sut.severity).toBe('error');
        expect(actual.severity).toBe('warning');
      });
    });
  });
});

target('RuleDefinition.disable', () => {
  describe('無効化した新しいRuleDefinitionを返す', () => {
    context('有効なルールを無効化した場合', () => {
      it('enabled=falseの新インスタンスが返される', () => {
        // Arrange
        const sut = createRuleDefinition({ enabled: true });

        // Act
        const actual = sut.disable();

        // Assert
        expect(actual.isEnabled()).toBe(false);
        expect(sut === actual).toBe(false);
      });
    });

    context('—', () => {
      it('元のインスタンスは変更されない', () => {
        // Arrange
        const sut = createRuleDefinition({ enabled: true });

        // Act
        const actual = sut.disable();

        // Assert
        expect(sut.isEnabled()).toBe(true);
        expect(actual.isEnabled()).toBe(false);
      });
    });
  });
});

target('RuleDefinition.usesInput', () => {
  describe('必要な入力種別を判定する', () => {
    context('requiredInputsに含まれるRequiredInputの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createRuleDefinition({
          requiredInputs: Object.freeze([createRequiredInput('import-graph')]),
        });
        const input = createRequiredInput('import-graph');

        // Act
        const actual = sut.usesInput(input);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('requiredInputsに含まれないRequiredInputの場合', () => {
      it('falseを返す', () => {
        // Arrange
        const sut = createRuleDefinition({
          requiredInputs: Object.freeze([createRequiredInput('import-graph')]),
        });
        const input = createRequiredInput('workspace-inventory');

        // Act
        const actual = sut.usesInput(input);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('RuleDefinition.isEnabled', () => {
  describe('有効/無効を返す', () => {
    context('enabled=trueの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const sut = createRuleDefinition({ enabled: true });

        // Act
        const actual = sut.isEnabled();

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('RuleDefinition.equals', () => {
  describe('等価性を判定する', () => {
    context('同一属性のRuleDefinitionの場合', () => {
      it('trueを返す', () => {
        // Arrange
        const left = createRuleDefinition();
        const right = createRuleDefinition();

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
