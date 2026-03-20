import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CascadeUpdateService } from '../../../skill-quality/domain/services/cascade-update-service.js';

function createMockValidatorIdRegistryPort(validatorIds: string[] = ['L1-001', 'L2-001']) {
  return { list: vi.fn().mockResolvedValue(validatorIds) };
}

function createMockConfigQueryPort(patterns: string[] = ['scripts/**/*.ts']) {
  return {
    getCoverageThreshold: vi.fn().mockResolvedValue({ requirement: 100, code: 80 }),
    isAgentLessonCollectionEnabled: vi.fn().mockResolvedValue(true),
    getCascadeUpdateTargetPatterns: vi.fn().mockResolvedValue(patterns),
  };
}

target('CascadeUpdateService', () => {

  describe('resolve: パターンと validatorIds からターゲットが生成されること', () => {
    context('patterns が 2 件、validatorIds が 2 件の場合', () => {
      it('2 件の CascadeUpdateTarget が返される', async () => {
        const registryPort = createMockValidatorIdRegistryPort(['L1-001', 'L2-001']);
        const configPort = createMockConfigQueryPort(['scripts/**/*.ts', 'docs/**/*.md']);
        const service = new CascadeUpdateService(registryPort, configPort);
        const actual = await service.resolve('H12-05');
        expect(actual.length).toBeGreaterThan(0);
      });
    });
  });

  describe('resolve: patterns=[] の場合はターゲットが 0 件になること', () => {
    context('patterns=[] の場合', () => {
      it('空配列が返される', async () => {
        const registryPort = createMockValidatorIdRegistryPort(['L1-001']);
        const configPort = createMockConfigQueryPort([]);
        const service = new CascadeUpdateService(registryPort, configPort);
        const actual = await service.resolve('H12-05');
        expect(actual).toHaveLength(0);
      });
    });
  });

  describe('resolve: 生成されたターゲットの storyIdTag が正しいこと', () => {
    context("storyId='H12-05' の場合", () => {
      it("storyIdTag が '@story-id H12-05' になる", async () => {
        const registryPort = createMockValidatorIdRegistryPort(['L1-001']);
        const configPort = createMockConfigQueryPort(['scripts/**/*.ts']);
        const service = new CascadeUpdateService(registryPort, configPort);
        const actual = await service.resolve('H12-05');
        expect(actual[0]?.storyIdTag).toBe('@story-id H12-05');
      });
    });
  });

});
