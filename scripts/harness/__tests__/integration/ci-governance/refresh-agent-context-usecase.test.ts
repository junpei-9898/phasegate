// @unit ci-governance
// @layer integration
// @work-item-id WI-032
// @work-item-id WI-190
// @work-item-id WI-198
// @story H13-03

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCiGovernance } from '../../../ci-governance/composition-root.js';
import { createInstallationModule } from '../../../installation/composition-root.js';
import { context, target } from '../../helpers/test-helpers.js';

async function withTempProject<T>(testFn: (projectRoot: string) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'phasegate-agent-context-'));
  try {
    return await testFn(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function previewAgentContext(harnessRoot: string) {
  return await withTempProject(async (projectRoot) => {
    const mod = buildCiGovernance(projectRoot, harnessRoot);
    return await mod.refreshAgentContextHandler.handle({ dryRun: true, format: 'json' });
  });
}

async function applyAgentContextWithUserSection(harnessRoot: string) {
  return await withTempProject(async (projectRoot) => {
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
}

async function installRefreshThenDryRunReconcile(harnessRoot: string) {
  return await withTempProject(async (projectRoot) => {
    const installation = createInstallationModule();
    const installed = await installation.installHandler.execute({
      projectRoot,
      harnessRoot,
      phasegateVersion: '0.160.7',
      dryRun: false,
      apply: true,
      force: true,
      json: true,
    });
    expect(installed.exitCode).toBe(0);

    const refreshed = await buildCiGovernance(projectRoot, harnessRoot).refreshAgentContextHandler.handle({
      apply: true,
      format: 'json',
    });
    expect(refreshed.exitCode).toBe(0);

    const reconciled = await installation.reconcileHandler.execute({
      projectRoot,
      harnessRoot,
      phasegateVersion: '0.160.7',
      dryRun: true,
      apply: false,
      force: false,
      json: true,
    });
    const plan = (JSON.parse(reconciled.stdout) as {
      plan: Array<{ path: string; changed: boolean }>;
    }).plan;
    const byPath = new Map(plan.map((item) => [item.path, item]));
    return {
      claudeMdChanged: byPath.get('CLAUDE.md')?.changed,
      agentsMdChanged: byPath.get('AGENTS.md')?.changed,
      packageJsonChanged: byPath.get('package.json')?.changed,
    };
  });
}

target('RefreshAgentContextUseCase', () => {
  describe('AGENTS.md と CLAUDE.md を更新する', () => {
    context('dry-run で実行する場合', () => {
      it('ファイルを書き換えず preview を返すこと', async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await previewAgentContext(harnessRoot);

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(JSON.parse(actual.output).applied).toBe(false);
        expect(JSON.parse(actual.output).claudeMd.preview).toContain('phasegate doctor');
        expect(JSON.parse(actual.output).claudeMd.preview).toContain('phasegate config:plan --intent l4-strict --dry-run');
        expect(JSON.parse(actual.output).claudeMd.preview).not.toContain('- `phasegate ci:auto-refresh-agent-context --apply`');
      });
    });

    context('apply で実行する場合', () => {
      it('CLAUDE.md の user section を保持すること', async () => {
        // Arrange
        const harnessRoot = process.cwd();

        // Act
        const actual = await applyAgentContextWithUserSection(harnessRoot);

        // Assert
        expect(actual.result.exitCode).toBe(0);
        expect(JSON.parse(actual.result.output).applied).toBe(true);
        expect(actual.content).toContain('既存の独自指示');
        expect(actual.content).toContain('PhaseGate Commands');
      });

      it('refresh apply 直後の reconcile dry-run は managed agent context を no-op と判定すること', async () => {
        // Arrange
        const harnessRoot = resolve(process.cwd());

        // Act
        const actual = await installRefreshThenDryRunReconcile(harnessRoot);

        // Assert
        expect(actual.claudeMdChanged).toBe(false);
        expect(actual.agentsMdChanged).toBe(false);
        expect(actual.packageJsonChanged).toBe(false);
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
