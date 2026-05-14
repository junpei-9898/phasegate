// @layer test
// @unit skill-quality
// @story H12-02
// @work-item-id WI-188
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { VitestCoverageRunnerAdapter } from '../../../skill-quality/infrastructure/adapters/vitest-coverage-runner-adapter.js';

target('VitestCoverageRunnerAdapter', () => {
  let tmpDir: string;
  let summaryProjectDir: string;
  let emptyProjectDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phasegate-vitest-runner-'));
    summaryProjectDir = path.join(tmpDir, 'with-summary');
    emptyProjectDir = path.join(tmpDir, 'without-summary');
    fsSync.mkdirSync(path.join(summaryProjectDir, '.harness'), { recursive: true });
    fsSync.mkdirSync(emptyProjectDir, { recursive: true });
    fsSync.writeFileSync(
      path.join(summaryProjectDir, '.harness/coverage-summary.json'),
      JSON.stringify({ total: { lines: { pct: 88 }, branches: { pct: 77 }, functions: { pct: 99 } } }),
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('run(storyId)', () => {
    it('coverage summary が存在する場合は Vitest を起動せず結果を返すこと', async () => {
      // Arrange
      const execFile = () => {
        throw new Error('Vitest should not launch when coverage summary already exists');
      };
      const adapter = new VitestCoverageRunnerAdapter(summaryProjectDir, execFile as never);

      // Act
      const actual = await adapter.run('H12-02');

      // Assert
      expect(actual).toEqual({
        lineCoverage: 88,
        branchCoverage: 77,
        functionCoverage: 99,
      });
    });

    it('local Vitest が存在しない場合は npx 起動に進まず guidance error を返すこと', async () => {
      // Arrange
      const execFile = () => {
        throw new Error('Vitest should not launch without a local dependency');
      };
      const adapter = new VitestCoverageRunnerAdapter(emptyProjectDir, execFile as never);

      // Act
      const actual = await adapter.run('H12-02').catch((error: unknown) => error);

      // Assert
      expect(actual).toMatchObject({
        name: 'SkillQualityError',
        code: 'COVERAGE_RUN_FAILED',
        message: 'Install vitest locally before running coverage: npm install -D vitest @vitest/coverage-v8',
      });
    });
  });
});
