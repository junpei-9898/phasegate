// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { BiomeModificationSpec } from '../../../../regression-suite/domain/value-objects/biome-modification-spec.js';

target('BiomeModificationSpec', () => {
  // UT-RS-118
  describe('create: targetApi・replacementApi・modificationReason が有効な場合', () => {
    it('正常に生成される', () => {
      const actual = BiomeModificationSpec.create({
        targetApi: 'eslint-plugin-api',
        replacementApi: 'biome-lint-rule',
        modificationReason: 'ESLint固有APIをBiome対応APIに置換',
      });
      expect(actual.targetApi).toBe('eslint-plugin-api');
      expect(actual.replacementApi).toBe('biome-lint-rule');
    });
  });

  // UT-RS-119
  describe("create: targetApi='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() =>
        BiomeModificationSpec.create({ targetApi: '', replacementApi: 'biome-rule', modificationReason: '理由' })
      ).toThrow();
    });
  });

  // UT-RS-120
  describe("create: replacementApi='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() =>
        BiomeModificationSpec.create({ targetApi: 'eslint-api', replacementApi: '', modificationReason: '理由' })
      ).toThrow();
    });
  });

  // UT-RS-121
  describe('create: targetApi === replacementApi の場合', () => {
    context('置換前後が同一の場合', () => {
      it('エラーをスロー', () => {
        expect(() =>
          BiomeModificationSpec.create({ targetApi: 'same-api', replacementApi: 'same-api', modificationReason: '理由' })
        ).toThrow();
      });
    });
  });

  // UT-RS-122
  describe('equals: 同一値のBiomeModificationSpecを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = BiomeModificationSpec.create({ targetApi: 'eslint-api', replacementApi: 'biome-rule', modificationReason: '理由' });
      const b = BiomeModificationSpec.create({ targetApi: 'eslint-api', replacementApi: 'biome-rule', modificationReason: '理由' });
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-123
  describe('equals: 異なるtargetApiのBiomeModificationSpecを比較する場合', () => {
    it('非等価', () => {
      const a = BiomeModificationSpec.create({ targetApi: 'eslint-api-a', replacementApi: 'biome-rule', modificationReason: '理由' });
      const b = BiomeModificationSpec.create({ targetApi: 'eslint-api-b', replacementApi: 'biome-rule', modificationReason: '理由' });
      expect(a.equals(b)).toBe(false);
    });
  });

  // UT-RS-124
  describe('immutable: 生成後の値は変更されない', () => {
    it('targetApi が変更されない', () => {
      const spec = BiomeModificationSpec.create({ targetApi: 'eslint-api', replacementApi: 'biome-rule', modificationReason: '理由' });
      try { (spec as unknown as Record<string, unknown>)['targetApi'] = 'changed'; } catch (_) { /* no-op */ }
      expect(spec.targetApi).toBe('eslint-api');
    });
  });
});
