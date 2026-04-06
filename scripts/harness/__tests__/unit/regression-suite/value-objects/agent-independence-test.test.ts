// @layer test
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AgentIndependenceTest } from '../../../../regression-suite/domain/value-objects/agent-independence-test.js';

target('AgentIndependenceTest', () => {
  // UT-RS-068
  describe('create: targetModule・forbiddenPatterns 1件・allowedPaths で有効な場合', () => {
    it('正常に生成される', () => {
      const actual = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/regression-suite/domain/services/regression-runner.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      expect(actual.targetModule).toBe('scripts/harness/regression-suite/domain/services/regression-runner.ts');
      expect(actual.forbiddenPatterns).toHaveLength(1);
    });
  });

  // UT-RS-069
  describe('create: forbiddenPatterns が複数の場合', () => {
    it('正常に生成される', () => {
      const actual = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code', 'some-agent-sdk'],
        allowedPaths: ['infrastructure/adapters/'],
      });
      expect(actual.forbiddenPatterns).toHaveLength(2);
    });
  });

  // UT-RS-070
  describe('create: forbiddenPatterns=[] の場合（INV-10）', () => {
    context('禁止パターンが空の場合', () => {
      it('EmptyForbiddenPatternsError をスロー', () => {
        expect(() =>
          AgentIndependenceTest.create({
            targetModule: 'scripts/harness/x/domain/y.ts',
            forbiddenPatterns: [],
            allowedPaths: [],
          })
        ).toThrow('EmptyForbiddenPatternsError');
      });
    });
  });

  // UT-RS-071
  describe("create: targetModule='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() =>
        AgentIndependenceTest.create({
          targetModule: '',
          forbiddenPatterns: ['@anthropic-ai/claude-code'],
          allowedPaths: [],
        })
      ).toThrow();
    });
  });

  // UT-RS-072
  describe('create: allowedPaths が空配列の場合', () => {
    it('正常に生成される（allowedPaths は任意）', () => {
      const actual = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      expect(actual.allowedPaths).toHaveLength(0);
    });
  });

  // UT-RS-073
  describe('immutable: forbiddenPatternsの変更が反映されない', () => {
    it('forbiddenPatterns が変更されない（ReadonlyArray）', () => {
      const test = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      const originalLength = test.forbiddenPatterns.length;
      try { (test.forbiddenPatterns as unknown[]).push('new-pattern'); } catch (_) { /* no-op */ }
      expect(test.forbiddenPatterns.length).toBe(originalLength);
    });
  });

  // UT-RS-074
  describe('equals: 同一値のAgentIndependenceTestを比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      const b = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-075
  describe('equals: 異なるtargetModuleのAgentIndependenceTestを比較する場合', () => {
    it('非等価', () => {
      const a = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/a/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      const b = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/b/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      expect(a.equals(b)).toBe(false);
    });
  });

  // UT-RS-076
  describe('equals: 同一targetModuleで異なるforbiddenPatternsの場合', () => {
    it('非等価', () => {
      const a = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x/domain/y.ts',
        forbiddenPatterns: ['@anthropic-ai/claude-code'],
        allowedPaths: [],
      });
      const b = AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x/domain/y.ts',
        forbiddenPatterns: ['some-other-package'],
        allowedPaths: [],
      });
      expect(a.equals(b)).toBe(false);
    });
  });
});
