import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FuseWriteScope, type FuseWriteScopePathConfig } from '../../../fuse-hooks-engine/domain/value-objects/fuse-write-scope.js';

const DEFAULT_PATHS: FuseWriteScopePathConfig = {
  source: ['scripts/harness'],
  construction: 'docs/product/construction',
  inception: 'docs/inception',
};

target('FuseWriteScope', () => {
  context('fromPath — ソースコードパス', () => {
    it('ソースファイルは level 3 + unitId を返す', () => {
      // Arrange
      const filePath = 'scripts/harness/my-unit/domain/foo.ts';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual).not.toBeNull();
      expect(actual!.level).toBe(3);
      expect(actual!.unitId).toBe('my-unit');
      expect(actual!.storyId).toBeUndefined();
    });

    it('ネストしたソースファイルも level 3 + unitId を返す', () => {
      // Arrange
      const filePath = 'scripts/harness/config-foundation/infrastructure/adapters/reader.ts';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(3);
      expect(actual!.unitId).toBe('config-foundation');
    });
  });

  context('fromPath — construction パス', () => {
    it('construction ドキュメントは level 2 + unitId を返す', () => {
      // Arrange
      const filePath = 'docs/product/construction/my-unit/domain_model.md';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(2);
      expect(actual!.unitId).toBe('my-unit');
    });
  });

  context('fromPath — inception パス', () => {
    it('inception shared は level 1 を返す', () => {
      // Arrange
      const filePath = 'docs/inception/_shared/product_overview_plan.md';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(1);
      expect(actual!.unitId).toBeUndefined();
    });

    it('横断的 issue は level 1 を返す', () => {
      // Arrange
      const filePath = 'docs/inception/issues/ISSUE-001/description.md';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(1);
    });

    it('Unit + storyId パスは level 3 を返す', () => {
      // Arrange
      const filePath = 'docs/inception/my-unit/HF1-01/scenario_test_design.md';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(3);
      expect(actual!.unitId).toBe('my-unit');
      expect(actual!.storyId).toBe('HF1-01');
    });

    it('Unit固有 issue は level 3 を返す', () => {
      // Arrange
      const filePath = 'docs/inception/my-unit/issues/ISSUE-002/description.md';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(3);
      expect(actual!.unitId).toBe('my-unit');
      expect(actual!.storyId).toBe('ISSUE-002');
    });

    it('inception Unit直下（storyId なし）は level 2 を返す', () => {
      // Arrange
      const filePath = 'docs/inception/my-unit/domain_model_plan.md';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(2);
      expect(actual!.unitId).toBe('my-unit');
    });
  });

  context('fromPath — 許可パス（null を返す）', () => {
    it('__tests__ パスは null を返す', () => {
      // Arrange
      const filePath = 'scripts/harness/my-unit/__tests__/foo.test.ts';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual).toBeNull();
    });

    it('管理外パスは null を返す', () => {
      // Arrange & Act & Assert
      expect(FuseWriteScope.fromPath('README.md', DEFAULT_PATHS)).toBeNull();
      expect(FuseWriteScope.fromPath('package.json', DEFAULT_PATHS)).toBeNull();
      expect(FuseWriteScope.fromPath('.eslintrc.json', DEFAULT_PATHS)).toBeNull();
    });

    it('空文字は null を返す', () => {
      // Arrange & Act & Assert
      expect(FuseWriteScope.fromPath('', DEFAULT_PATHS)).toBeNull();
    });
  });

  context('fromPath — パス正規化', () => {
    it('Windows バックスラッシュも正しく解析する', () => {
      // Arrange
      const filePath = 'scripts\\harness\\my-unit\\domain\\foo.ts';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(3);
      expect(actual!.unitId).toBe('my-unit');
    });

    it('./ プレフィックスを除去して解析する', () => {
      // Arrange
      const filePath = './scripts/harness/my-unit/domain/foo.ts';
      // Act
      const actual = FuseWriteScope.fromPath(filePath, DEFAULT_PATHS);
      // Assert
      expect(actual!.level).toBe(3);
      expect(actual!.unitId).toBe('my-unit');
    });
  });
});
