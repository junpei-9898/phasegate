import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { target, context } from '../../helpers/test-helpers.js';
import { FusePhaseGateCheckAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/fuse-phase-gate-check-adapter.js';

const DEFAULT_PATHS = {
  source: ['scripts/harness'] as readonly string[],
  construction: 'docs/product/construction',
  inception: 'docs/inception',
};

function createTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'fuse-gate-'));
}

function touchFile(rootDir: string, relativePath: string): void {
  const fullPath = join(rootDir, relativePath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, '');
}

function createAllL1Artifacts(rootDir: string, unitId: string): void {
  const l1Files = [
    'docs/inception/_shared/product_overview_plan.md',
    'docs/product/product_overview.md',
    'docs/inception/_shared/story_writer_plan.md',
    'docs/product/user_stories.md',
    'docs/inception/_shared/story_mapping_plan.md',
    'docs/product/user_story_mapping.md',
    'docs/inception/_shared/unit_design_plan.md',
    'docs/product/units/integration_contract.md',
    `docs/product/units/${unitId}_unit.md`,
  ];
  for (const file of l1Files) {
    touchFile(rootDir, file);
  }
}

function createAllL2Artifacts(rootDir: string, unitId: string): void {
  const l2Files = [
    `docs/inception/${unitId}/domain_model_plan.md`,
    `docs/product/construction/${unitId}/domain_model.md`,
    `docs/inception/${unitId}/logical_design_plan.md`,
    `docs/product/construction/${unitId}/logical_design.md`,
    `docs/inception/${unitId}/it_test_design_plan.md`,
    `docs/product/construction/${unitId}/it_test_design.md`,
    `docs/inception/${unitId}/unit_test_design_plan.md`,
    `docs/product/construction/${unitId}/unit_test_design.md`,
    `docs/inception/${unitId}/it_test_logic_plan.md`,
    `docs/product/construction/${unitId}/it_test_logic.md`,
    `docs/inception/${unitId}/unit_test_logic_plan.md`,
    `docs/product/construction/${unitId}/unit_test_logic.md`,
  ];
  for (const file of l2Files) {
    touchFile(rootDir, file);
  }
}

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

target('FusePhaseGateCheckAdapter', () => {
  context('管理外パス', () => {
    it('管理外パスへの書き込みは常に許可される', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('package.json');

      // Assert
      expect(actual.allowed).toBe(true);
    });

    it('テストファイルへの書き込みは常に許可される', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('scripts/harness/my-unit/__tests__/foo.test.ts');

      // Assert
      expect(actual.allowed).toBe(true);
    });
  });

  context('Level 1 書き込み', () => {
    it('Level 1 パスへの書き込みは常に許可される', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('docs/inception/_shared/product_overview_plan.md');

      // Assert
      expect(actual.allowed).toBe(true);
    });
  });

  context('Level 2 書き込み — L1 前提チェック', () => {
    it('全 L1 文書が存在する場合は許可される', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      createAllL1Artifacts(rootDir, 'my-unit');
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('docs/product/construction/my-unit/domain_model.md');

      // Assert
      expect(actual.allowed).toBe(true);
    });

    it('L1 文書が不足している場合はブロックされる', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      // L1 artifacts を作成しない
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('docs/product/construction/my-unit/domain_model.md');

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toContain('L1前提文書が不足');
    });
  });

  context('Level 3 書き込み — L1 + L2 前提チェック', () => {
    it('全 L1 + L2 文書が存在する場合は許可される', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      createAllL1Artifacts(rootDir, 'my-unit');
      createAllL2Artifacts(rootDir, 'my-unit');
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('scripts/harness/my-unit/domain/foo.ts');

      // Assert
      expect(actual.allowed).toBe(true);
    });

    it('L1 文書が不足している場合はブロックされる', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      // L1 なし、L2 あり
      createAllL2Artifacts(rootDir, 'my-unit');
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('scripts/harness/my-unit/domain/foo.ts');

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toContain('L1前提文書が不足');
    });

    it('L2 文書が不足している場合はブロックされる', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      createAllL1Artifacts(rootDir, 'my-unit');
      // L2 は作成しない
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('scripts/harness/my-unit/domain/foo.ts');

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toContain('L2前提文書が不足');
    });

    it('不足文書のパスが reason に含まれる', () => {
      // Arrange
      const rootDir = createTmpDir();
      tmpDirs.push(rootDir);
      createAllL1Artifacts(rootDir, 'my-unit');
      // L2 の一部のみ作成
      touchFile(rootDir, 'docs/inception/my-unit/domain_model_plan.md');
      touchFile(rootDir, 'docs/product/construction/my-unit/domain_model.md');
      const sut = new FusePhaseGateCheckAdapter({ rootDir, paths: DEFAULT_PATHS });

      // Act
      const actual = sut.isWriteAllowed('scripts/harness/my-unit/domain/foo.ts');

      // Assert
      expect(actual.allowed).toBe(false);
      expect(actual.reason).toContain('docs/inception/my-unit/logical_design_plan.md');
    });
  });
});
