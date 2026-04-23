// @layer test
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type {
  ArchitectureProviderInfo,
  RuleConfigProviderPort,
} from '../../../biome-ast-engine/domain/ports/rule-config-provider-port.js';
import { RuleDefinitionRegistry } from '../../../biome-ast-engine/domain/services/rule-definition-registry.js';
import { ResolveEnabledRulesUseCase } from '../../../biome-ast-engine/application/usecases/resolve-enabled-rules-usecase.ts';

const DEFAULT_ARCHITECTURE: ArchitectureProviderInfo = {
  preset: 'clean',
  layers: ['domain', 'application', 'infrastructure', 'presentation'],
  allowedDependencies: {
    domain: ['domain'],
    application: ['application', 'domain'],
    infrastructure: ['infrastructure', 'application', 'domain'],
    presentation: ['presentation', 'application', 'domain'],
  },
};

const FLAT_ARCHITECTURE: ArchitectureProviderInfo = {
  preset: 'flat',
  layers: [],
  allowedDependencies: {},
};

const createSut = (
  config: {
    enabled: boolean;
    rules: Record<string, 'error' | 'warning' | 'off'>;
  },
  architecture: ArchitectureProviderInfo = DEFAULT_ARCHITECTURE,
) => {
  const ruleConfigProviderPort: RuleConfigProviderPort = {
    getL1Config: vi.fn().mockResolvedValue(config),
    getArchitecture: vi.fn().mockResolvedValue(architecture),
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

    context('architecture preset が flat の場合', () => {
      it('user 未指定時は L1-001〜004 (require-unit-comment / require-layer-comment / no-layer-violation / enforce-folder-structure) が自動で skipped に入る', async () => {
        // Arrange
        const { sut } = createSut(
          {
            enabled: true,
            rules: {},
          },
          FLAT_ARCHITECTURE,
        );

        // Act
        const actual = await sut.execute();

        // Assert
        const skippedNames = actual.skippedRules.map((name) => name.toString());
        expect(skippedNames).toContain('require-unit-comment');
        expect(skippedNames).toContain('require-layer-comment');
        expect(skippedNames).toContain('no-layer-violation');
        expect(skippedNames).toContain('enforce-folder-structure');
        const enabledNames = actual.enabledRules.map((rule) => rule.name.toString());
        expect(enabledNames).toContain('no-any-abuse');
        expect(enabledNames).toContain('no-code-duplication');
        expect(enabledNames).toContain('no-comment-flood');
        expect(enabledNames).toContain('no-ghost-file');
      });

      it('user が明示的に error を指定したルールは preset 既定より優先され enabled に残る', async () => {
        // Arrange
        const { sut } = createSut(
          {
            enabled: true,
            rules: {
              'require-unit-comment': 'error',
            },
          },
          FLAT_ARCHITECTURE,
        );

        // Act
        const actual = await sut.execute();

        // Assert
        const enabledNames = actual.enabledRules.map((rule) => rule.name.toString());
        const skippedNames = actual.skippedRules.map((name) => name.toString());
        expect(enabledNames).toContain('require-unit-comment');
        expect(skippedNames).not.toContain('require-unit-comment');
        // 他 3 ルールは user 未指定のため preset 既定で skipped
        expect(skippedNames).toContain('require-layer-comment');
        expect(skippedNames).toContain('no-layer-violation');
        expect(skippedNames).toContain('enforce-folder-structure');
      });

      it('user が overrideRules で off を指定した場合も一貫して skipped になる', async () => {
        // Arrange
        const { sut } = createSut(
          {
            enabled: true,
            rules: {},
          },
          FLAT_ARCHITECTURE,
        );

        // Act
        const actual = await sut.execute({
          overrideRules: {
            'require-unit-comment': 'off',
          },
        });

        // Assert
        const skippedNames = actual.skippedRules.map((name) => name.toString());
        expect(skippedNames).toContain('require-unit-comment');
      });
    });

    context('architecture preset が clean の場合', () => {
      it('既定では L1-001〜004 は auto-disable されず enabled に含まれる', async () => {
        // Arrange
        const { sut } = createSut({
          enabled: true,
          rules: {},
        });

        // Act
        const actual = await sut.execute();

        // Assert
        const enabledNames = actual.enabledRules.map((rule) => rule.name.toString());
        expect(enabledNames).toContain('require-unit-comment');
        expect(enabledNames).toContain('require-layer-comment');
        expect(enabledNames).toContain('no-layer-violation');
        expect(enabledNames).toContain('enforce-folder-structure');
      });
    });

    context('architecture preset の layers と allowedDependencies を architectureSpec として出力する', () => {
      it('onion 風のカスタム architecture を渡した場合、architectureSpec に同一値が透過される', async () => {
        // Arrange
        const ONION_ARCHITECTURE: ArchitectureProviderInfo = {
          preset: 'onion',
          layers: ['domain', 'application', 'interface'],
          allowedDependencies: {
            domain: ['domain'],
            application: ['application', 'domain'],
            interface: ['interface', 'application', 'domain'],
          },
        };
        const { sut } = createSut(
          {
            enabled: true,
            rules: {},
          },
          ONION_ARCHITECTURE,
        );

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.architectureSpec.layers).toEqual(['domain', 'application', 'interface']);
        expect(actual.architectureSpec.allowedDependencies.interface).toEqual([
          'interface',
          'application',
          'domain',
        ]);
      });
    });
  });
});
