// @unit ci-governance
// @layer test
// @story H12-01

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { BaselineSnapshot } from '../../../../ci-governance/domain/value-objects/baseline-snapshot.js';
import { BaselineEntry } from '../../../../ci-governance/domain/value-objects/baseline-entry.js';

const SHA = (c: string) => c.repeat(40);
const ISO_NOW = '2026-04-21T12:34:56.000Z';

target('BaselineSnapshot', () => {
  describe('生成テスト', () => {
    context('複数エントリ + ISO8601 createdAt を渡した場合', () => {
      it('UT-CG-BS-001a: 正常に BaselineSnapshot が生成される', () => {
        const snapshot = BaselineSnapshot.create({
          createdAt: ISO_NOW,
          algorithm: 'sha1',
          entries: [
            BaselineEntry.create({ path: 'a.ts', sha1: SHA('a') }),
            BaselineEntry.create({ path: 'b.ts', sha1: SHA('b') }),
          ],
        });
        expect(snapshot.entryCount).toBe(2);
        expect(snapshot.algorithm).toBe('sha1');
        expect(snapshot.createdAt).toBe(ISO_NOW);
      });
    });

    context('空 entries を渡した場合', () => {
      it('UT-CG-BS-001b: 空スナップショットが生成される', () => {
        const snapshot = BaselineSnapshot.create({
          createdAt: ISO_NOW,
          algorithm: 'sha1',
          entries: [],
        });
        expect(snapshot.entryCount).toBe(0);
      });
    });

    context('createdAt が ISO8601 でない場合', () => {
      it('UT-CG-BS-001c: エラーがスローされる', () => {
        expect(() =>
          BaselineSnapshot.create({
            createdAt: '2026/04/21',
            algorithm: 'sha1',
            entries: [],
          }),
        ).toThrow(/ISO 8601/);
      });
    });

    context('同一 path が複数 entries に含まれる場合', () => {
      it('UT-CG-BS-001d: エラーがスローされる', () => {
        expect(() =>
          BaselineSnapshot.create({
            createdAt: ISO_NOW,
            algorithm: 'sha1',
            entries: [
              BaselineEntry.create({ path: 'a.ts', sha1: SHA('a') }),
              BaselineEntry.create({ path: 'a.ts', sha1: SHA('b') }),
            ],
          }),
        ).toThrow(/duplicate path/);
      });
    });
  });

  describe('contains(path)', () => {
    it('UT-CG-BS-002a: 含まれるパスは true', () => {
      const snapshot = BaselineSnapshot.create({
        createdAt: ISO_NOW,
        algorithm: 'sha1',
        entries: [BaselineEntry.create({ path: 'scripts/foo.ts', sha1: SHA('a') })],
      });
      expect(snapshot.contains('scripts/foo.ts')).toBe(true);
    });

    it('UT-CG-BS-002b: 含まれないパスは false', () => {
      const snapshot = BaselineSnapshot.create({
        createdAt: ISO_NOW,
        algorithm: 'sha1',
        entries: [BaselineEntry.create({ path: 'scripts/foo.ts', sha1: SHA('a') })],
      });
      expect(snapshot.contains('scripts/bar.ts')).toBe(false);
    });
  });
});
