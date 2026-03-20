import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { RuleConfigProviderPort } from '../../../biome-ast-engine/domain/ports/rule-config-provider-port.js';
import { RuleDefinitionRegistry } from '../../../biome-ast-engine/domain/services/rule-definition-registry.js';
import { ResolveEnabledRulesUseCase } from '../../../biome-ast-engine/application/usecases/resolve-enabled-rules-usecase.ts';

const createSut = (config: {
  enabled: boolean;
  rules: Record<string, 'error' | 'warning' | 'off'>;
}) => {
  const ruleConfigProviderPort: RuleConfigProviderPort = {
    getL1Config: vi.fn().mockResolvedValue(config),
  };

  return {
    ruleConfigProviderPort,
    sut: new ResolveEnabledRulesUseCase({
      ruleConfigProviderPort,
      ruleDefinitionRegistry: new RuleDefinitionRegistry(),
    }),
  };
};

target('ResolveEnabledRulesUseCase.execute', () => {
  describe('有効ルールを解決する', () => {
    context('L1全体が無効な場合', () => {
      it('enabledRulesが空になり8ルールすべてがskippedRulesに入る', async () => {
        // Arrange
        const { sut, ruleConfigProviderPort } = createSut({
          enabled: false,
          rules: {},
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(ruleConfigProviderPort.getL1Config).toHaveBeenCalledTimes(1);
        expect(actual.enabledRules).toEqual([]);
        expect(actual.skippedRules.map((ruleName) => ruleName.toString())).toHaveLength(8);
      });
    });

    context('個別ルールがoffの場合', () => {
      it('対象ルールがskippedRulesへ移動する', async () => {
        // Arrange
        const { sut } = createSut({
          enabled: true,
          rules: {
            'require-layer-comment': 'off',
          },
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.enabledRules.some((rule) => rule.name.toString() === 'require-layer-comment')).toBe(false);
        expect(actual.skippedRules.map((ruleName) => ruleName.toString())).toContain('require-layer-comment');
      });
    });

    context('overrideRulesでwarningを指定した場合', () => {
      it('指定ルールのseverityがwarningで返される', async () => {
        // Arrange
        const { sut } = createSut({
          enabled: true,
          rules: {},
        });

        // Act
        const actual = await sut.execute({
          overrideRules: {
            'no-comment-flood': 'warning',
          },
        });

        // Assert
        expect(
          actual.enabledRules.find((rule) => rule.name.toString() === 'no-comment-flood')?.severity
        ).toBe('warning');
      });
    });
  });
});
