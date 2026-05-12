// @layer test
// @unit ci-governance
// @story H08-03
// @work-item-id WI-124

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidatorIdRegistryAdapter } from '../../../ci-governance/infrastructure/adapters/validator-id-registry-adapter.js';

target('ValidatorIdRegistryAdapter', () => {
  describe('live validator-system registry を参照する', () => {
    context('listAll を呼ぶ場合', () => {
      it('stubではなく L4-004/L4-005 を含む live ID を返す', async () => {
        const adapter = new ValidatorIdRegistryAdapter();

        const actual = await adapter.listAll();

        expect(actual).toContain('L2-001');
        expect(actual).toContain('L4-004');
        expect(actual).toContain('L4-005');
        expect(actual).not.toContain('v1');
      });
    });

    context('standard preset の aidlc-gate template の場合', () => {
      it('L2/L3 を含み L4 scheduled validators は除外する', async () => {
        const adapter = new ValidatorIdRegistryAdapter();

        const actual = await adapter.listForPreset('standard', 'aidlc-gate');

        expect(actual).toEqual(expect.arrayContaining(['L2-001', 'L3-001']));
        expect(actual.filter((id) => id.startsWith('L4-'))).toEqual([]);
      });
    });

    context('standard preset の consistency-check template の場合', () => {
      it('scheduled audit metadata として L4 全件を含む', async () => {
        const adapter = new ValidatorIdRegistryAdapter();

        const listedValidatorIds = await adapter.listForPreset('standard', 'consistency-check');
        const actual = listedValidatorIds.filter((id) => id.startsWith('L4-'));

        expect(actual).toEqual([
          'L4-001',
          'L4-002',
          'L4-003',
          'L4-004',
          'L4-005',
        ]);
      });
    });
  });
});
