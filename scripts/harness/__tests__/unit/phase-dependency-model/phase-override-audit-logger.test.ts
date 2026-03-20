import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PhaseOverrideAuditLogger } from '../../../phase-dependency-model/infrastructure/logging/phase-override-audit-logger.js';

let tmpDir: string;

function createTmpDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdm-audit-'));
  return tmpDir;
}

function createPayload(
  overrides: {
    unitId?: string;
    storyId?: string;
    targetLevel?: 1 | 2 | 3;
    appliedRules?: readonly string[];
    generatedAt?: string;
    requestedOverride?: boolean;
  } = {},
): {
  scope: { unitId?: string; storyId?: string };
  targetLevel: 1 | 2 | 3;
  appliedRules: readonly string[];
  generatedAt: string;
  requestedOverride: boolean;
} {
  return {
    scope: { unitId: overrides.unitId, storyId: overrides.storyId },
    targetLevel: overrides.targetLevel ?? 2,
    appliedRules: overrides.appliedRules ?? [],
    generatedAt: overrides.generatedAt ?? '2026-03-14T00:00:00Z',
    requestedOverride: overrides.requestedOverride ?? false,
  };
}

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

target('PhaseOverrideAuditLogger.record', () => {
  describe('フェーズオーバーライド監査ログを記録する', () => {
    context('1件の監査ペイロードを記録する場合', () => {
      it('JSONL形式でファイルに1行追記される', async () => {
        // Arrange
        const outputDir = createTmpDir();
        const sut = new PhaseOverrideAuditLogger({ outputDir });
        const payload = createPayload({
          unitId: 'u1',
          storyId: 's1',
          targetLevel: 2,
          appliedRules: ['rule-a'],
          requestedOverride: true,
        });

        // Act
        await sut.record(payload);

        // Assert
        const filePath = path.join(outputDir, 'phase-override-audit.jsonl');
        const actual = JSON.parse(fs.readFileSync(filePath, 'utf8').trim());
        expect(actual.scope.unitId).toBe('u1');
        expect(actual.targetLevel).toBe(2);
        expect(actual.requestedOverride).toBe(true);
      });
    });

    context('複数回recordを呼び出す場合', () => {
      it('JSONL形式で複数行が追記される', async () => {
        // Arrange
        const outputDir = createTmpDir();
        const sut = new PhaseOverrideAuditLogger({ outputDir });
        const first = createPayload({ unitId: 'u1', targetLevel: 1 });
        const second = createPayload({ unitId: 'u1', targetLevel: 2 });

        // Act
        await sut.record(first);
        await sut.record(second);

        // Assert
        const filePath = path.join(outputDir, 'phase-override-audit.jsonl');
        const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
        const actual = lines.length;
        expect(actual).toBe(2);
        expect(JSON.parse(lines[0]).targetLevel).toBe(1);
        expect(JSON.parse(lines[1]).targetLevel).toBe(2);
      });
    });

    context('出力ディレクトリが存在しない場合', () => {
      it('ディレクトリが自動作成されログが書き込まれる', async () => {
        // Arrange
        const baseDir = createTmpDir();
        const outputDir = path.join(baseDir, 'nested', 'output');
        const sut = new PhaseOverrideAuditLogger({ outputDir });
        const payload = createPayload({
          targetLevel: 3,
          appliedRules: ['r1', 'r2'],
        });

        // Act
        await sut.record(payload);

        // Assert
        const filePath = path.join(outputDir, 'phase-override-audit.jsonl');
        const actual = fs.existsSync(filePath);
        expect(actual).toBe(true);
      });
    });
  });
});
