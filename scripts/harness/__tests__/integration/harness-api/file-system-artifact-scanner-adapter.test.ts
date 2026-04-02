import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { FileSystemArtifactScannerAdapter } from '../../../harness-api/infrastructure/adapters/file-system-artifact-scanner-adapter.js';

// Vitest runs from project root (phasegate), so fixtures path is relative to cwd
const FIXTURE_BASE = path.resolve(
  process.cwd(),
  'scripts/harness/__tests__/fixtures/harness-api/artifact-scan'
);

function getPresence(result: { foundArtifacts: readonly { layer?: string; layerId?: string; present: boolean }[] }, layerId: string): boolean {
  const entry = result.foundArtifacts.find((a) => a.layer === layerId || a.layerId === layerId);
  return entry?.present ?? false;
}

target('FileSystemArtifactScannerAdapter', () => {
  // ─── IT-Adapter-ArtifactScanner-001 ───
  describe('full-artifactsフィクスチャ: L1-L3の成果物が存在する場合', () => {
    context('full-artifactsディレクトリを指定した場合', () => {
      it('L1・L3がpresent=trueのArtifactScanResultが返される', async () => {
        // Arrange
        const adapter = new FileSystemArtifactScannerAdapter({
          basePath: path.join(FIXTURE_BASE, 'full-artifacts'),
        });

        // Act
        const actual = await adapter.scan();

        // Assert
        expect(getPresence(actual, 'L1')).toBe(true);
        expect(getPresence(actual, 'L3')).toBe(true);
      });
    });
  });

  // ─── IT-Adapter-ArtifactScanner-002 ───
  describe('missing-l3フィクスチャ: L3の成果物が欠損している場合', () => {
    context('missing-l3ディレクトリを指定した場合', () => {
      it('L1がpresent=true・L3がpresent=falseのArtifactScanResultが返される', async () => {
        // Arrange
        const adapter = new FileSystemArtifactScannerAdapter({
          basePath: path.join(FIXTURE_BASE, 'missing-l3'),
        });

        // Act
        const actual = await adapter.scan();

        // Assert
        expect(getPresence(actual, 'L1')).toBe(true);
        expect(getPresence(actual, 'L3')).toBe(false);
      });
    });
  });

  // ─── IT-Adapter-ArtifactScanner-003 ───
  describe('emptyフィクスチャ: 成果物が存在しない場合', () => {
    context('空のディレクトリを指定した場合', () => {
      it('L1がpresent=falseのArtifactScanResultが返される', async () => {
        // Arrange
        const adapter = new FileSystemArtifactScannerAdapter({
          basePath: path.join(FIXTURE_BASE, 'empty'),
        });

        // Act
        const actual = await adapter.scan();

        // Assert
        expect(getPresence(actual, 'L1')).toBe(false);
      });
    });
  });

  // ─── IT-Adapter-ArtifactScanner-004 ───
  describe('存在しないbasePathを指定した場合、エラーがスローされること', () => {
    context('存在しないパスを指定した場合', () => {
      it('エラーがスローされる', async () => {
        // Arrange
        const adapter = new FileSystemArtifactScannerAdapter({
          basePath: path.join(FIXTURE_BASE, 'non-existent-path'),
        });

        // Act & Assert
        await expect(adapter.scan()).rejects.toThrow();
      });
    });
  });

  // ─── IT-Adapter-ArtifactScanner-005 ───
  describe('basePath・configPath両方未指定の場合、エラーがスローされること', () => {
    context('オプションなしで生成した場合', () => {
      it('エラーがスローされる', async () => {
        // Arrange
        const adapter = new FileSystemArtifactScannerAdapter();

        // Act & Assert
        await expect(adapter.scan()).rejects.toThrow();
      });
    });
  });
});
