import { target, context, createValidatorIdRegistryPortMock, createPresetConfigPortMock } from '../../../helpers/test-helpers.js';
import { describe, it, vi, expect } from 'vitest';
import { TemplateGenerator } from '../../../../ci-governance/domain/services/template-generator.js';

target('TemplateGenerator', () => {
  describe('generateConfigテスト', () => {
    // UT-TG-001
    context('presetId="standard"・templateType="aidlc-gate"でpresetとvalidatorIdが有効な場合', () => {
      it('triggerCondition="pull_request"のResult.ok(TemplateConfig)が返る', async () => {
        const validatorPort = createValidatorIdRegistryPortMock(['v1', 'v2']);
        const presetPort = createPresetConfigPortMock(false);
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        expect(actual.isOk()).toBe(true);
        expect(actual.value.triggerCondition).toBe('pull_request');
        expect(actual.value.targetValidatorIds).toEqual(['v1', 'v2']);
      });
    });

    // UT-TG-002
    context('templateType="consistency-check"で有効なデータが返る場合', () => {
      it('triggerCondition="schedule"のTemplateConfigが返る', async () => {
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock(true);
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('standard', 'consistency-check');
        expect(actual.isOk()).toBe(true);
        expect(actual.value.triggerCondition).toBe('schedule');
        expect(actual.value.failOnWarning).toBe(true);
      });
    });

    // UT-TG-003
    context('templateType="pre-commit"・presetId="minimal"で有効なデータが返る場合', () => {
      it('triggerCondition="pre-commit"のTemplateConfigが返る', async () => {
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock(false);
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('minimal', 'pre-commit');
        expect(actual.isOk()).toBe(true);
        expect(actual.value.triggerCondition).toBe('pre-commit');
      });
    });

    // UT-TG-004
    context('PresetConfigPortがI/O失敗した場合', () => {
      it('Result.fail(HarnessError[])が返る', async () => {
        const validatorPort = createValidatorIdRegistryPortMock();
        const presetPort = { getPreset: vi.fn().mockRejectedValue(new Error('I/O error')) };
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        expect(actual.isOk()).toBe(false);
        expect(actual.error.length).toBeGreaterThan(0);
      });
    });

    // UT-TG-005
    context('ValidatorIdRegistryPortが空リスト[]を返した場合', () => {
      it('Result.fail(HarnessError[])が返る（targetValidatorIdsが空になるため）', async () => {
        const validatorPort = createValidatorIdRegistryPortMock([]);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        expect(actual.isOk()).toBe(false);
      });
    });
  });

  describe('TemplateType×TriggerConditionマッピングテスト（D6ルール）', () => {
    // UT-TG-006
    context('templateType="aidlc-gate"を渡した場合（D6ルール）', () => {
      it('triggerCondition="pull_request"になる', async () => {
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        expect(actual.value.triggerCondition).toBe('pull_request');
      });
    });

    // UT-TG-007
    context('templateType="consistency-check"を渡した場合（D6ルール）', () => {
      it('triggerCondition="schedule"になる', async () => {
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('standard', 'consistency-check');
        expect(actual.value.triggerCondition).toBe('schedule');
      });
    });

    // UT-TG-008
    context('templateType="pre-commit"を渡した場合（D6ルール）', () => {
      it('triggerCondition="pre-commit"になる', async () => {
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const actual = await generator.generateConfig('standard', 'pre-commit');
        expect(actual.value.triggerCondition).toBe('pre-commit');
      });
    });
  });
});
