import { target, context, createEscalationAction } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { EscalationAction } from '../../../../ci-governance/domain/value-objects/escalation-action.js';

target('EscalationAction', () => {
  describe('生成テスト', () => {
    // UT-EA-001
    context('logLevel="warn", 有効なmessageTemplateを渡した場合', () => {
      it('正常にEscalationActionが生成される', () => {
        const actual = EscalationAction.create({ logLevel: 'warn', messageTemplate: 'Error {errorCode} occurred {count} times' });
        expect(actual.logLevel).toBe('warn');
        expect(actual.messageTemplate).toBe('Error {errorCode} occurred {count} times');
      });
    });

    // UT-EA-002
    context('logLevel="error"を渡した場合', () => {
      it('logLevel="error"のEscalationActionが生成される', () => {
        const actual = EscalationAction.create({ logLevel: 'error', messageTemplate: 'Critical: {errorCode} x{count}' });
        expect(actual.logLevel).toBe('error');
      });
    });

    // UT-EA-003
    context('messageTemplate=""（空文字）を渡した場合', () => {
      it('空文字不可エラーがスローされる', () => {
        expect(() => EscalationAction.create({ logLevel: 'warn', messageTemplate: '' })).toThrow();
      });
    });

    // UT-EA-004
    context('logLevel="info"（不正値）を渡した場合', () => {
      it('EscalationLogLevel不正値エラーがスローされる', () => {
        expect(() => EscalationAction.create({ logLevel: 'info' as any, messageTemplate: 'test' })).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-EA-005
    context('messageTemplate=""でcreateを呼ぶ場合', () => {
      it('生成が失敗する', () => {
        expect(() => EscalationAction.create({ logLevel: 'warn', messageTemplate: '' })).toThrow();
      });
    });

    // UT-EA-006
    context('logLevel="debug"を渡した場合', () => {
      it('生成が失敗する', () => {
        expect(() => EscalationAction.create({ logLevel: 'debug' as any, messageTemplate: 'test' })).toThrow();
      });
    });
  });

  describe('formatMessageテスト', () => {
    // UT-EA-007
    context('messageTemplate="Error {errorCode} x{count}"にerrorCode・countを渡した場合', () => {
      it('"Error L1-001 x3"が返る', () => {
        const action = EscalationAction.create({ logLevel: 'warn', messageTemplate: 'Error {errorCode} x{count}' });
        const actual = action.formatMessage({ errorCode: 'L1-001', count: 3 });
        expect(actual).toBe('Error L1-001 x3');
      });
    });

    // UT-EA-008
    context('テンプレートに{errorCode}プレースホルダーがない場合', () => {
      it('テンプレートそのままが返る（置換なし）', () => {
        const action = EscalationAction.create({ logLevel: 'warn', messageTemplate: 'Fixed message' });
        const actual = action.formatMessage({ errorCode: 'L1-001', count: 1 });
        expect(actual).toBe('Fixed message');
      });
    });
  });

  describe('等値性テスト', () => {
    // UT-EA-009
    context('同一logLevel・messageTemplateを持つ2つのEscalationActionを比較した場合', () => {
      it('equals()がtrueを返す', () => {
        const a = createEscalationAction();
        const b = createEscalationAction();
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });

    // UT-EA-010
    context('logLevelが異なる2つのEscalationActionを比較した場合', () => {
      it('equals()がfalseを返す', () => {
        const a = createEscalationAction({ logLevel: 'warn' });
        const b = createEscalationAction({ logLevel: 'error' });
        const actual = a.equals(b);
        expect(actual).toBe(false);
      });
    });
  });
});
