// @layer test
// @unit phase-dependency-model
// @story H02-01
// @work-item-id WI-085
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ValidateCustomizationPolicyUseCase } from '../../../phase-dependency-model/application/usecases/validate-customization-policy-usecase.js';
import type { PhaseConfigProviderPort } from '../../../phase-dependency-model/domain/ports/phase-config-provider-port.js';
import { CustomRule } from '../../../phase-dependency-model/domain/values/custom-rule.js';
import { PhaseCustomizationPolicy } from '../../../phase-dependency-model/domain/values/phase-customization-policy.js';

const createRule = (targetPhase: string, action: readonly string[]) =>
  CustomRule.create({
    targetPhase,
    condition: 'requires-all',
    action,
  });

const createPhaseConfigProvider = (policy: PhaseCustomizationPolicy): PhaseConfigProviderPort => ({
  getCustomizationPolicy: vi.fn().mockResolvedValue(policy),
  getPlanningMode: vi.fn(),
  getReportingOutputDir: vi.fn(),
  getStoryReflectionConfig: vi.fn(),
  getPathRoots: vi.fn().mockResolvedValue({
    designDocsRoot: 'docs/product/construction',
    inceptionDocsRoot: 'docs/inception',
  }),
});

target('ValidateCustomizationPolicyUseCase', () => {
  describe('execute', () => {
    context('有効な追加依存ルールを検証する場合', () => {
      it('valid=trueとeffectiveRulesを返すこと', async () => {
        // Arrange
        const policy = PhaseCustomizationPolicy.create({
          rules: [createRule('2:unit-test-logic-designer', ['1:unit-designer'])],
          overrideEnabled: false,
        });
        const sut = new ValidateCustomizationPolicyUseCase({
          phaseConfigProvider: createPhaseConfigProvider(policy),
        });

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual).toEqual({
          valid: true,
          errors: [],
          warnings: [],
          effectiveRules: ['1:unit-designer->2:unit-test-logic-designer'],
        });
      });
    });

    context('未知ノードを参照するルールを検証する場合', () => {
      it('Domain例外をerrorsへ写像すること', async () => {
        // Arrange
        const policy = PhaseCustomizationPolicy.create({
          rules: [createRule('9:unknown', ['1:unit-designer'])],
          overrideEnabled: false,
        });
        const sut = new ValidateCustomizationPolicyUseCase({
          phaseConfigProvider: createPhaseConfigProvider(policy),
        });

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.errors[0]).toContain('未知のノード参照です');
      });
    });

    context('override付きの削除要求を検証する場合', () => {
      it('override警告を付けてerrorsへ写像すること', async () => {
        // Arrange
        const policy = PhaseCustomizationPolicy.create({
          rules: [createRule('2:domain-designer', ['remove:1:unit-designer'])],
          overrideEnabled: true,
        });
        const sut = new ValidateCustomizationPolicyUseCase({
          phaseConfigProvider: createPhaseConfigProvider(policy),
        });

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.warnings).toEqual(['overrideが要求されています']);
        expect(actual.errors[0]).toContain('削除できない依存です');
      });
    });
  });
});
