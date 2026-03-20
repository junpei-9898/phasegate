import { target, context, createTemplateConfig } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { TemplateConfig } from '../../../../ci-governance/domain/value-objects/template-config.js';

target('TemplateConfig', () => {
  describe('生成テスト', () => {
    // UT-TC-001
    context('targetValidatorIds=["v1"], triggerCondition="pull_request", failOnWarning=falseを渡した場合', () => {
      it('正常にTemplateConfigが生成される', () => {
        const input = { targetValidatorIds: ['v1'], triggerCondition: 'pull_request' as const, failOnWarning: false };
        const actual = TemplateConfig.create(input);
        expect(actual.targetValidatorIds).toEqual(['v1']);
        expect(actual.triggerCondition).toBe('pull_request');
        expect(actual.failOnWarning).toBe(false);
      });
    });

    // UT-TC-002
    context('targetValidatorIds=["v1","v2","v3"], triggerCondition="schedule", failOnWarning=trueを渡した場合', () => {
      it('複数ValidatorIdでTemplateConfigが生成される', () => {
        const input = { targetValidatorIds: ['v1', 'v2', 'v3'], triggerCondition: 'schedule' as const, failOnWarning: true };
        const actual = TemplateConfig.create(input);
        expect(actual.targetValidatorIds).toHaveLength(3);
        expect(actual.failOnWarning).toBe(true);
      });
    });

    // UT-TC-003
    context('triggerCondition="pre-commit"を渡した場合', () => {
      it('pre-commitのTemplateConfigが生成される', () => {
        const input = { targetValidatorIds: ['v1'], triggerCondition: 'pre-commit' as const, failOnWarning: false };
        const actual = TemplateConfig.create(input);
        expect(actual.triggerCondition).toBe('pre-commit');
      });
    });

    // UT-TC-004
    context('targetValidatorIds=[]（空リスト）を渡した場合', () => {
      it('INV-2違反でエラーがスローされる', () => {
        const input = { targetValidatorIds: [], triggerCondition: 'pull_request' as const, failOnWarning: false };
        expect(() => TemplateConfig.create(input)).toThrow();
      });
    });

    // UT-TC-005
    context('triggerCondition="push"（不正値）を渡した場合', () => {
      it('TriggerCondition不正値でエラーがスローされる', () => {
        const input = { targetValidatorIds: ['v1'], triggerCondition: 'push' as any, failOnWarning: false };
        expect(() => TemplateConfig.create(input)).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-TC-006
    context('targetValidatorIds=[]でcreateを呼ぶ場合（INV-2）', () => {
      it('生成が失敗する', () => {
        const input = { targetValidatorIds: [], triggerCondition: 'pull_request' as const, failOnWarning: false };
        expect(() => TemplateConfig.create(input)).toThrow();
      });
    });

    // UT-TC-007
    context('生成後にtargetValidatorIdsを変更しようとした場合', () => {
      it('変更が反映されない（immutable）', () => {
        const actual = createTemplateConfig({ targetValidatorIds: ['v1'] });
        const original = actual.targetValidatorIds.slice();
        try {
          (actual.targetValidatorIds as any).push('v2');
        } catch {
          // frozen array throws TypeError in strict mode - expected
        }
        expect(actual.targetValidatorIds).toEqual(original);
      });
    });
  });

  describe('等値性テスト', () => {
    // UT-TC-008
    context('同一フィールドを持つ2つのTemplateConfigを比較した場合', () => {
      it('equals()がtrueを返す', () => {
        const a = createTemplateConfig({ targetValidatorIds: ['v1'], triggerCondition: 'pull_request', failOnWarning: false });
        const b = createTemplateConfig({ targetValidatorIds: ['v1'], triggerCondition: 'pull_request', failOnWarning: false });
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });

    // UT-TC-009
    context('failOnWarningのみ異なる2つのTemplateConfigを比較した場合', () => {
      it('equals()がfalseを返す', () => {
        const a = createTemplateConfig({ failOnWarning: false });
        const b = createTemplateConfig({ failOnWarning: true });
        const actual = a.equals(b);
        expect(actual).toBe(false);
      });
    });

    // UT-TC-010
    context('targetValidatorIdsの内容が同一だが順序が異なる2つのTemplateConfigを比較した場合', () => {
      it('equals()がtrueを返す（順序非依存）', () => {
        const a = createTemplateConfig({ targetValidatorIds: ['v1', 'v2'] });
        const b = createTemplateConfig({ targetValidatorIds: ['v2', 'v1'] });
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });
  });
});
