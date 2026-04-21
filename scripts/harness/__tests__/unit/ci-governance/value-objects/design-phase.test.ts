// @unit ci-governance
// @layer test
// @story H12-04

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import {
  DesignPhase,
  DESIGN_PHASES,
} from '../../../../ci-governance/domain/value-objects/design-phase.js';

target('DesignPhase', () => {
  describe('create', () => {
    context('許容値を渡した場合', () => {
      it('UT-CG-DP-001: logical / domain / uiux / unit-test / it-test で生成できる', () => {
        for (const phase of DESIGN_PHASES) {
          const sut = DesignPhase.create(phase);
          expect(sut.value).toBe(phase);
        }
      });
    });

    context('未知値を渡した場合', () => {
      it('UT-CG-DP-002: 許容値一覧を含む例外を投げる', () => {
        expect(() => DesignPhase.create('invalid')).toThrow(/未知の設計 phase/);
        expect(() => DesignPhase.create('invalid')).toThrow(/logical/);
      });
    });
  });

  describe('isValid', () => {
    context('値の妥当性を問い合わせた場合', () => {
      it('UT-CG-DP-003: 許容値で true、未知値で false', () => {
        expect(DesignPhase.isValid('logical')).toBe(true);
        expect(DesignPhase.isValid('unknown')).toBe(false);
      });
    });
  });

  describe('equals', () => {
    context('同じ phase 同士', () => {
      it('UT-CG-DP-004: true を返す', () => {
        expect(DesignPhase.create('logical').equals(DesignPhase.create('logical'))).toBe(true);
      });
    });
    context('異なる phase 同士', () => {
      it('UT-CG-DP-005: false を返す', () => {
        expect(DesignPhase.create('logical').equals(DesignPhase.create('domain'))).toBe(false);
      });
    });
  });

  describe('templateFileName / designDocFileName', () => {
    context('各 phase のファイル名を問い合わせた場合', () => {
      it('UT-CG-DP-006: phase ごとのファイル名が得られる', () => {
        const cases: Array<[string, string, string]> = [
          ['logical', 'logical_design.template.md', 'logical_design.md'],
          ['domain', 'domain_model.template.md', 'domain_model.md'],
          ['uiux', 'uiux_design.template.md', 'uiux_design.md'],
          ['unit-test', 'unit_test_design.template.md', 'unit_test_design.md'],
          ['it-test', 'it_test_design.template.md', 'it_test_design.md'],
        ];
        for (const [phase, tpl, doc] of cases) {
          const sut = DesignPhase.create(phase);
          expect(sut.templateFileName).toBe(tpl);
          expect(sut.designDocFileName).toBe(doc);
        }
      });
    });
  });
});
