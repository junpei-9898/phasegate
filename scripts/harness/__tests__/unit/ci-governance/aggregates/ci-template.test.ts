import { target, context, createCiTemplate, createTemplateConfig, createConfiguredCiTemplate } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { CiTemplate } from '../../../../ci-governance/domain/aggregates/ci-template.js';

target('CiTemplate', () => {
  describe('生成テスト（create）', () => {
    // UT-CT-001
    context('templateType="aidlc-gate", presetRef="standard"を渡した場合', () => {
      it('config=null・isConfigured()=falseのCiTemplateが生成される', () => {
        const actual = CiTemplate.create('aidlc-gate', 'standard');
        expect(actual.templateType).toBe('aidlc-gate');
        expect(actual.isConfigured()).toBe(false);
      });
    });

    // UT-CT-002
    context('templateType="consistency-check", presetRef="minimal"を渡した場合', () => {
      it('CiTemplateが生成される', () => {
        const actual = CiTemplate.create('consistency-check', 'minimal');
        expect(actual.templateType).toBe('consistency-check');
      });
    });

    // UT-CT-003
    context('templateType="pre-commit", presetRef="strict"を渡した場合', () => {
      it('CiTemplateが生成される', () => {
        const actual = CiTemplate.create('pre-commit', 'strict');
        expect(actual.templateType).toBe('pre-commit');
      });
    });

    // UT-CT-004
    context('templateType="invalid-type"（不正値）を渡した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-1違反）', () => {
        expect(() => CiTemplate.create('invalid-type' as any, 'standard')).toThrow();
      });
    });

    // UT-CT-005
    context('presetRef=""（空文字）を渡した場合', () => {
      it('エラーがスローされる', () => {
        expect(() => CiTemplate.create('aidlc-gate', '')).toThrow();
      });
    });
  });

  describe('withConfigテスト', () => {
    // UT-CT-006
    context('有効なTemplateConfig（targetValidatorIds=["v1"]）を注入した場合', () => {
      it('isConfigured()=trueのCiTemplateが返る（新インスタンス）', () => {
        const template = createCiTemplate();
        const config = createTemplateConfig({ targetValidatorIds: ['v1'] });
        const actual = template.withConfig(config);
        expect(actual.isConfigured()).toBe(true);
        expect(actual).not.toBe(template);
      });
    });

    // UT-CT-007
    context('targetValidatorIds=[]のTemplateConfigを注入した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-2違反）', () => {
        const template = createCiTemplate();
        expect(() => template.withConfig({ targetValidatorIds: [], triggerCondition: 'pull_request', failOnWarning: false } as any)).toThrow();
      });
    });

    // UT-CT-008
    context('withConfig()を2回連続で呼び出した場合', () => {
      it('後のwithConfig()の設定で上書きされた新インスタンスが返る', () => {
        const template = createCiTemplate();
        const config1 = createTemplateConfig({ targetValidatorIds: ['v1'] });
        const config2 = createTemplateConfig({ targetValidatorIds: ['v2', 'v3'] });
        const first = template.withConfig(config1);
        const actual = first.withConfig(config2);
        expect(actual.config!.targetValidatorIds).toEqual(['v2', 'v3']);
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-CT-009
    context('templateType="schedule"（INV-1違反）でcreateを呼ぶ場合', () => {
      it('エラーがスローされる', () => {
        expect(() => CiTemplate.create('schedule' as any, 'standard')).toThrow();
      });
    });

    // UT-CT-010
    context('withConfig()に空のtargetValidatorIds（INV-2違反）を渡した場合', () => {
      it('エラーがスローされる', () => {
        const template = createCiTemplate();
        const invalidConfig = { targetValidatorIds: [], triggerCondition: 'pull_request', failOnWarning: false } as any;
        expect(() => template.withConfig(invalidConfig)).toThrow();
      });
    });
  });

  describe('validateテスト', () => {
    // UT-CT-011
    context('有効なconfig注入済みCiTemplateに対してvalidate()を呼ぶ場合', () => {
      it('HarnessError[]が空配列を返す（検証通過）', () => {
        const actual = createConfiguredCiTemplate();
        const errors = actual.validate();
        expect(errors).toHaveLength(0);
      });
    });

    // UT-CT-012
    context('config=null（withConfig()未呼び出し）のCiTemplateに対してvalidate()を呼ぶ場合', () => {
      it('"設定未注入"エラーを含むHarnessError[]が返る', () => {
        const actual = createCiTemplate();
        const errors = actual.validate();
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isConfiguredテスト', () => {
    // UT-CT-013
    context('create()直後のCiTemplateに対してisConfigured()を呼ぶ場合', () => {
      it('falseを返す', () => {
        const actual = createCiTemplate();
        expect(actual.isConfigured()).toBe(false);
      });
    });

    // UT-CT-014
    context('withConfig()適用後のCiTemplateに対してisConfigured()を呼ぶ場合', () => {
      it('trueを返す', () => {
        const actual = createConfiguredCiTemplate();
        expect(actual.isConfigured()).toBe(true);
      });
    });
  });
});
