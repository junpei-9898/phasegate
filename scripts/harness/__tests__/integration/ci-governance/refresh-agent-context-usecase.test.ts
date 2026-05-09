// @unit ci-governance
// @layer integration
// @work-item-id WI-032
// @story H13-03

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCiGovernance } from '../../../ci-governance/composition-root.js';
import { context, target } from '../../helpers/test-helpers.js';

async function withTempProject<T>(testFn: (projectRoot: string) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'phasegate-agent-context-'));
  try {
    return await testFn(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

target('RefreshAgentContextUseCase', () => {
  describe('AGENTS.md と CLAUDE.md を更新する', () => {
    context('dry-run で実行する場合', () => {
      it('ファイルを書き換えず preview を返すこと', async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          const mod = buildCiGovernance(projectRoot, harnessRoot);
          return await mod.refreshAgentContextHandler.handle({ dryRun: true, format: 'json' });
        });

        // Assert
        const parsed = JSON.parse(actual.output);
        expect(actual.exitCode).toBe(0);
        expect(parsed.applied).toBe(false);
        expect(parsed.claudeMd.preview).toContain('phasegate ci:auto-refresh-agent-context --apply');
      });
    });

    context('apply で実行する場合', () => {
      it('CLAUDE.md の user section を保持すること', async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await writeFile(
            join(projectRoot, 'CLAUDE.md'),
            [
              '# CLAUDE.md',
              '<!-- phasegate:user-section:start -->',
              '既存の独自指示',
              '<!-- phasegate:user-section:end -->',
              '',
            ].join('\n'),
            'utf-8',
          );
          const mod = buildCiGovernance(projectRoot, harnessRoot);
          const result = await mod.refreshAgentContextHandler.handle({ apply: true, format: 'json' });
          const content = await readFile(join(projectRoot, 'CLAUDE.md'), 'utf-8');
          return { result, content };
        });

        // Assert
        const parsed = JSON.parse(actual.result.output);
        expect(actual.result.exitCode).toBe(0);
        expect(parsed.applied).toBe(true);
        expect(actual.content).toContain('既存の独自指示');
        expect(actual.content).toContain('PhaseGate Commands');
      });
    });

    context('既存 CLAUDE.md に marker が無い場合', () => {
      it('既存内容を user section として保持すること', async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await withTempProject(async (projectRoot) => {
          await writeFile(join(projectRoot, 'CLAUDE.md'), '# Existing\n\n独自の運用ルール\n', 'utf-8');
          const mod = buildCiGovernance(projectRoot, harnessRoot);
          await mod.refreshClaudeMdHandler.handle({ apply: true, format: 'json' });
          return await readFile(join(projectRoot, 'CLAUDE.md'), 'utf-8');
        });

        // Assert
        expect(actual).toContain('# Existing');
        expect(actual).toContain('独自の運用ルール');
        expect(actual).toContain('<!-- phasegate:user-section:start -->');
      });
    });
  });
});
