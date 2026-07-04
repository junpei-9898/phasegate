// @unit agent-integration
// @layer test
// @story H12-02

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CiGovernanceBaselineGrandfatherAdapter } from '../../../agent-integration/infrastructure/adapters/ci-governance-baseline-grandfather-adapter.js';
import { BaselineSnapshot } from '../../../ci-governance/domain/value-objects/baseline-snapshot.js';
import { BaselineEntry } from '../../../ci-governance/domain/value-objects/baseline-entry.js';
import type { BaselineRepositoryPort } from '../../../ci-governance/domain/ports/baseline-repository-port.js';
import type { FileHasherPort } from '../../../ci-governance/domain/ports/file-hasher-port.js';

const SHA = (c: string) => c.repeat(40);
const ISO_NOW = '2026-04-22T00:00:00.000Z';

/**
 * baseline entry の sha1 と一致するハッシュを返すハッシャー stub。
 * snapshotWith(paths) と同じ規則 (index%16 の hex 文字 40 回) で
 * 実ファイルが baseline 記録内容と一致している状況を再現する。
 */
function matchingHasher(paths: readonly string[]): (baseDir: string) => FileHasherPort {
  const index = new Map(paths.map((p, i) => [p, SHA((i % 16).toString(16))] as const));
  return () => ({
    hashFile: vi.fn(async (relativePath: string) => {
      const sha1 = index.get(relativePath);
      if (sha1 === undefined) throw new Error(`ENOENT: ${relativePath}`);
      return sha1;
    }),
  });
}

/** 常に与えた固定 sha1 を返す (整合性不一致を再現する) ハッシャー stub。 */
function fixedHasher(sha1: string): (baseDir: string) => FileHasherPort {
  return () => ({ hashFile: vi.fn(async () => sha1) });
}

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
    getStopHookEnforce: vi.fn().mockResolvedValue(false),
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
      it('IT-AI-BGF-003: 全 paths が baseline 内かつ sha1 一致なら allGrandfathered=true', async () => {
        const paths = ['scripts/harness/foo.ts', 'scripts/harness/bar.ts'];
        const snapshot = snapshotWith(paths);
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => snapshot),
            }),
          fileHasherFactory: matchingHasher(paths),
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
      it('IT-AI-BGF-004: 一部 paths が baseline 外なら allGrandfathered=false（all-or-nothing 判定）', async () => {
        const snapshot = snapshotWith(['scripts/harness/foo.ts']);
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => snapshot),
            }),
          fileHasherFactory: matchingHasher(['scripts/harness/foo.ts']),
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

  describe('整合性検証 (P-5 grandfather bypass 回帰)', () => {
    context('baseline に手動追記された path の sha1 が実ファイルと不一致', () => {
      it('IT-AI-BGF-007: sha1 不一致なら grandfather しない（手動追記 bypass を遮断）', async () => {
        // Arrange: attacker が baseline.json に evil.ts を追記 (記録 sha1 は "a"*40)
        const snapshot = BaselineSnapshot.create({
          createdAt: ISO_NOW,
          algorithm: 'sha1',
          entries: [
            BaselineEntry.create({
              path: 'scripts/harness/x/domain/evil.ts',
              sha1: SHA('a'),
            }),
          ],
        });
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => snapshot),
            }),
          // 実ファイル内容の sha1 は記録値と異なる
          fileHasherFactory: fixedHasher(SHA('b')),
        });

        // Act
        const actual = await adapter.check(['scripts/harness/x/domain/evil.ts']);

        // Assert
        expect(actual.allGrandfathered).toBe(false);
        expect(actual.grandfatheredPaths).toEqual([]);
      });
    });

    context('baseline の path は実在するが sha1 は一致', () => {
      it('IT-AI-BGF-008: sha1 一致なら grandfather する（正当な pre-existing ファイル）', async () => {
        // Arrange
        const paths = ['scripts/harness/x/domain/legit.ts'];
        const snapshot = snapshotWith(paths);
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => snapshot),
            }),
          fileHasherFactory: matchingHasher(paths),
        });

        // Act
        const actual = await adapter.check(paths);

        // Assert
        expect(actual.allGrandfathered).toBe(true);
        expect(actual.grandfatheredPaths).toEqual(paths);
      });
    });

    context('baseline の path は実在するがファイル読み取りに失敗', () => {
      it('IT-AI-BGF-009: ハッシュ計算失敗時は grandfather しない（保護側に倒す）', async () => {
        // Arrange
        const snapshot = snapshotWith(['scripts/harness/foo.ts']);
        const adapter = new CiGovernanceBaselineGrandfatherAdapter({
          baseDir: '/repo',
          configQueryPort: createConfigPort(true),
          baselineRepositoryFactory: () =>
            createRepoStub({
              exists: vi.fn(async () => true),
              load: vi.fn(async () => snapshot),
            }),
          fileHasherFactory: () => ({
            hashFile: vi.fn(async () => {
              throw new Error('ENOENT');
            }),
          }),
        });

        // Act
        const actual = await adapter.check(['scripts/harness/foo.ts']);

        // Assert
        expect(actual.allGrandfathered).toBe(false);
        expect(actual.grandfatheredPaths).toEqual([]);
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
