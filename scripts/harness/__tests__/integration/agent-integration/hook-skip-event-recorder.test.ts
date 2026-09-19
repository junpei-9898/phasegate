// @story H11-03
// @unit agent-integration
// @layer test
// @work-item-id WI-220
import { mkdtemp, readFile, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { recordHookSkipEvent } from '../../../agent-integration/presentation/hook-skip-event-recorder.js';

describe('hookスキップの診断記録', () => {
  const directories: string[] = [];
  afterEach(async () => {
    await Promise.all(directories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
  });
  it.each(['HOOK_DISABLED', 'READ_ONLY'])('正常な%sでは記録ディレクトリを作らない', async reason => {
    // Arrange
    const projectRoot = await mkdtemp(join(tmpdir(), 'phasegate-skip-'));
    directories.push(projectRoot);
    // Act
    await recordHookSkipEvent({ projectRoot, hookType: 'post-tool-use', reason, targetPaths: [] });
    // Assert
    await expect(access(join(projectRoot, '.phasegate'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('正常skipの反復は既存履歴を変更せず異常だけを追記する', async () => {
    // Arrange
    const projectRoot = await mkdtemp(join(tmpdir(), 'phasegate-skip-'));
    directories.push(projectRoot);
    await mkdir(join(projectRoot, '.phasegate'));
    const file = join(projectRoot, '.phasegate/hook-skip-events.jsonl');
    const original = '{"reason":"historical"}\n';
    await writeFile(file, original);
    // Act
    for (let i = 0; i < 3; i++) {
      await recordHookSkipEvent({ projectRoot, hookType: 'post-tool-use', reason: 'HOOK_DISABLED', targetPaths: [] });
    }
    const unchanged = await readFile(file, 'utf8');
    await recordHookSkipEvent({ projectRoot, hookType: 'post-tool-use', reason: 'TIMEOUT_EXCEEDED', targetPaths: ['src/a.ts'] });
    const actual = await readFile(file, 'utf8');
    // Assert
    expect(unchanged).toBe(original);
    expect(actual.startsWith(original)).toBe(true);
    expect(JSON.parse(actual.slice(original.length))).toMatchObject({ reason: 'TIMEOUT_EXCEEDED', targetPaths: ['src/a.ts'] });
  });
});
