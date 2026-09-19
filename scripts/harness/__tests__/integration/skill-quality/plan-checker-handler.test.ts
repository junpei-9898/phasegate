// @story H12-03
// @layer test
// @unit skill-quality
// @work-item-id WI-220
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSkillQualityHandlers } from '../../../skill-quality/composition-root.js';
import { RunPlanCheckerLoopHandler } from '../../../skill-quality/presentation/handlers/run-plan-checker-loop-handler.js';
import { RunPlanCheckerLoopUseCase } from '../../../skill-quality/application/usecases/run-plan-checker-loop-usecase.js';

describe('計画ファイルのチェックリスト評価', () => {
  const directories: string[] = [];
  afterEach(async () => {
    await Promise.all(directories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
  });

  it.each([
    { content: '- [x] 完了', code: 0 },
    { content: '- [ ] 未完了', code: 1 },
    { content: '- [ ] ', code: 1 },
  ])('本文「$content」を評価し実施した試行だけを報告する', async ({ content, code }) => {
    // Arrange
    const dir = await mkdtemp(join(tmpdir(), 'phasegate-plan-'));
    directories.push(dir);
    const planFile = join(dir, 'plan.md');
    await writeFile(planFile, content);
    const handler = createSkillQualityHandlers().runPlanCheckerLoopHandler;
    // Act
    const actual = await handler.handle({ planFile, storyId: 'WI-220' });
    // Assert
    expect(actual.exitCode).toBe(code);
    expect(actual.message).toContain('Attempt 1:');
    expect(actual.message).not.toContain('Attempt 2:');
    expect(actual.message).toContain('意味的');
  });

  it('存在しないファイルは本文として評価せず読込エラーを返す', async () => {
    // Arrange
    const dir = await mkdtemp(join(tmpdir(), 'phasegate-plan-'));
    directories.push(dir);
    const handler = createSkillQualityHandlers().runPlanCheckerLoopHandler;
    // Act
    const actual = await handler.handle({ planFile: join(dir, 'absent.md'), storyId: 'WI-220' });
    // Assert
    expect(actual.exitCode).toBe(2);
    expect(actual.message).toContain('ENOENT');
    expect(actual.message).not.toContain('Attempt');
  });

  it('旧constructorの直接利用では入力文字列を引き続き評価できる', async () => {
    // Arrange
    const handler = new RunPlanCheckerLoopHandler(new RunPlanCheckerLoopUseCase({
      evaluate: async document => ({ coverageRate: 100, gaps: document === '本文' ? [] : ['入力不一致'], revision: '1' }),
    }));
    // Act
    const actual = await handler.handle({ planFile: '本文', storyId: 'WI-220' });
    // Assert
    expect(actual.exitCode).toBe(0);
    expect(actual.message).toContain('PASSED');
  });
});
