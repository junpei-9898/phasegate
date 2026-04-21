// @unit agent-integration
// @layer test
// @story H12-02

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CiGovernanceBaselineGrandfatherAdapter } from '../../../agent-integration/infrastructure/adapters/ci-governance-baseline-grandfather-adapter.js';
import { BaselineSnapshot } from '../../../ci-governance/domain/value-objects/baseline-snapshot.js';
import { BaselineEntry } from '../../../ci-governance/domain/value-objects/baseline-entry.js';
import type { BaselineRepositoryPort } from '../../../ci-governance/domain/ports/baseline-repository-port.js';

const SHA = (c: string) => c.repeat(40);
const ISO_NOW = '2026-04-22T00:00:00.000Z';

function createConfigPort(enabled: boolean, customPath?: string) {
  return {
    isHookEnabled: vi.fn(),
    getProtectedFilePatterns: vi.fn().mockResolvedValue([]),
    getProtectedFileExclusions: vi.fn().mockResolvedValue([]),
    getRelaxedGates: vi.fn().mockResolvedValue([]),
    getProjectPaths: vi.fn().mockReturnValue({
      getSource: () => ['scripts/harness'],
      getDocsInception: () => 'docs/inception',
      getDocsConstruction: () => 'docs/product/construction',
    }),
    getBaselineConfig: vi.fn().mockResolvedValue({
      enabled,
      path: customPath ?? '.phasegate/baseline.json',
    }),
  };
}

function createRepoStub(
  overrides: Partial<BaselineRepositoryPort> = {},
): BaselineRepositoryPort {
  return {
    getPath: vi.fn(() => '/tmp/baseline.json'),
    exists: vi.fn(async () => false),
    save: vi.fn(async () => '/tmp/baseline.json'),
    load: vi.fn(async () => null),
    ...overrides,
  };
}

function snapshotWith(paths: readonly string[]): BaselineSnapshot {
  return BaselineSnapshot.create({
    createdAt: ISO_NOW,
    algorithm: 'sha1',
    entries: paths.map((p, i) =>
      BaselineEntry.create({ path: p, sha1: SHA((i % 16).toString(16)) }),
    ),
  });
}

target('CiGovernanceBaselineGrandfatherAdapter.check', () => {
  describe('enabled 判定', () => {
    context('baseline.json 無 + enabled=true', () => {
      it('IT-AI-BGF-001: allGrandfathered=false を返す', async () => {
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({ exists: vi.fn(async () => false) }),
        });
        const actual = await adapter.check(['scripts/harness/foo.ts']);
        expect(actual.allGrandfathered).toBe(false);
        expect(actual.baselineEnabled).toBe(true);
      });
    });

    context('config.baseline.enabled=false', () => {
      it('IT-AI-BGF-002: baseline.json 有でも allGrandfathered=false / repository 未参照', async () => {
        const repoFactory = vi.fn();
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(false),
          baselineRepositoryFactory: repoFactory,
        });
        const actual = await adapter.check(['scripts/harness/foo.ts']);
        expect(actual.allGrandfathered).toBe(false);
        expect(actual.baselineEnabled).toBe(false);
        expect(repoFactory).not.toHaveBeenCalled();
      });
    });
  });

  describe('grandfather 判定', () => {
    context('enabled=true + 全 paths が baseline 内', () => {
      it('IT-AI-BGF-003: allGrandfathered=true', async () => {
        const snapshot = snapshotWith(['scripts/harness/foo.ts', 'scripts/harness/bar.ts']);
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => snapshot),
            }),
        });
        const actual = await adapter.check([
          'scripts/harness/foo.ts',
          'scripts/harness/bar.ts',
        ]);
        expect(actual.allGrandfathered).toBe(true);
        expect(actual.grandfatheredPaths).toEqual([
          'scripts/harness/foo.ts',
          'scripts/harness/bar.ts',
        ]);
      });
    });

    context('enabled=true + 一部 paths が baseline 外', () => {
      it('IT-AI-BGF-004: allGrandfathered=false (all-or-nothing)', async () => {
        const snapshot = snapshotWith(['scripts/harness/foo.ts']);
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => snapshot),
            }),
        });
        const actual = await adapter.check([
          'scripts/harness/foo.ts',
          'scripts/harness/bar.ts',
        ]);
        expect(actual.allGrandfathered).toBe(false);
        expect(actual.grandfatheredPaths).toEqual(['scripts/harness/foo.ts']);
      });
    });

    context('targetFilePaths=[]', () => {
      it('IT-AI-BGF-005: allGrandfathered=false を返す', async () => {
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () => createRepoStub(),
        });
        const actual = await adapter.check([]);
        expect(actual.allGrandfathered).toBe(false);
      });
    });
  });

  describe('graceful degradation', () => {
    context('repository.load が例外を投げる', () => {
      it('IT-AI-BGF-006: allGrandfathered=false を返す（例外を吸収）', async () => {
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => {
                throw new Error('parse error');
              }),
            }),
        });
        const actual = await adapter.check(['scripts/harness/foo.ts']);
        expect(actual.allGrandfathered).toBe(false);
      });
    });
  });
});
