// @story H11-01
// @unit installation
// @layer integration
// @work-item-id WI-220
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createInstallationModule } from '../../../installation/composition-root.js';
import { DeploymentManifest } from '../../../installation/domain/deployment-manifest.js';

const fault = vi.hoisted(() => ({ root: '', trace: [] as string[], index: -1, when: 'before', count: 0 }));
vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  const replacements: Record<string, unknown> = {};
  for (const operation of ['writeFile', 'copyFile', 'rename'] as const) {
    replacements[operation] = async (...args: unknown[]) => {
      const destination = args[operation === 'writeFile' ? 0 : 1];
      const selected = fault.root !== '' && typeof destination === 'string' && destination.startsWith(fault.root + '/');
      const index = selected ? fault.count++ : -1;
      if (selected) fault.trace.push(`${operation}:${String(destination).slice(fault.root.length + 1).replace(/[0-9a-f-]+\.tmp$/, '<manifest>.tmp')}`);
      if (selected && index === fault.index && fault.when === 'before') throw new Error('Injected interrupted write');
      const actual = await (original[operation] as (...args: unknown[]) => Promise<unknown>)(...args);
      if (selected && index === fault.index && fault.when === 'after') throw new Error('Injected interrupted write');
      return actual;
    };
  }
  return { ...original, ...replacements };
});

async function put(root: string, path: string, content: string) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), content);
}

async function templates(root: string) {
  await mkdir(join(root, 'skills'), { recursive: true });
  for (const path of ['templates/.claude/settings.json', 'templates/.codex/hooks.json']) await put(root, path, '{"hooks":{}}\n');
  for (const name of ['deny-check.sh', 'format-settings-hook.sh', 'format-typescript-hook.sh', 'analyze-errors-hook.sh']) {
    await put(root, `templates/.claude/scripts/${name}`, '#!/bin/sh\nexit 0\n');
  }
  await put(root, 'templates/.claude/scripts/hook-config.json', '{}\n');
  for (const name of ['AGENTS', 'CLAUDE']) await put(root, `docs/templates/agent-context/${name}.md.template.md`, '<!-- phasegate:managed-section:start -->\nOld instructions.\n<!-- phasegate:managed-section:end -->\n');
  await put(root, 'package.json', '{"name":"fixture","version":"0.340.0"}\n');
}

describe('管理ファイル更新の中断と再開', () => {
  it('previewは台帳を変えず利用者のno-op編集を配布物として承認しないこと', async () => {
    const root = await mkdtemp(join(tmpdir(), 'phasegate-reconcile-attestation-'));
    const harness = join(root, 'harness');
    const project = join(root, 'project');
    const module = createInstallationModule();
    const input = { projectRoot: project, harnessRoot: harness, phasegateVersion: '0.340.0', dryRun: false, apply: true, force: false };
    try {
      await templates(harness);
      await mkdir(project);
      await module.manifestRepository.save(project, DeploymentManifest.create('0.340.0').withInstallationFlags({ includeCi: false, includeHusky: false, personal: false }));
      await module.runReconcileUseCase.execute(input);
      await module.runReconcileUseCase.execute(input);
      const template = '<!-- phasegate:managed-section:start -->\nUpdated instructions.\n<!-- phasegate:managed-section:end -->\n';
      await put(harness, 'docs/templates/agent-context/AGENTS.md.template.md', template);
      await put(project, 'AGENTS.md', template);
      const manifestPath = join(project, '.phasegate/manifest.json');
      const before = await readFile(manifestPath, 'utf8');

      const preview = await module.runReconcileUseCase.execute({ ...input, apply: false, dryRun: true });
      expect(preview.plan.find(item => item.path === 'AGENTS.md')?.summary).toContain('recover interrupted manifest hash');
      expect(await readFile(manifestPath, 'utf8')).toBe(before);
      const actual = await module.runReconcileUseCase.execute(input);
      expect(actual.refused).toEqual([]);
      expect(await readFile(manifestPath, 'utf8')).not.toBe(before);

      const attested = await module.manifestRepository.load(project);
      await put(project, 'AGENTS.md', `${template}\nUser-authored instructions.\n`);
      const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
      pkg.customUserField = 'keep';
      await put(project, 'package.json', `${JSON.stringify(pkg, null, 2)}\n`);
      const noOp = await module.runReconcileUseCase.execute(input);
      expect(noOp.refused).toEqual([]);
      const preserved = await module.manifestRepository.load(project);
      for (const path of ['AGENTS.md', 'package.json']) expect(preserved?.findEntry(path)?.hash.value).toBe(attested?.findEntry(path)?.hash.value);

      await put(harness, 'docs/templates/agent-context/AGENTS.md.template.md', template.replace('Updated', 'Next'));
      const next = await module.runReconcileUseCase.execute({ ...input, phasegateVersion: '0.341.0' });
      expect(next.refused.map(item => item.path).sort()).toEqual(['AGENTS.md', 'package.json']);
      expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toContain('User-authored instructions.');
      expect(JSON.parse(await readFile(join(project, 'package.json'), 'utf8')).customUserField).toBe('keep');
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('各書込境界から再開後にmanifestを整合させ次回更新で誤競合を起こさないこと', async () => {
    const root = await mkdtemp(join(tmpdir(), 'phasegate-reconcile-interruption-'));
    const harness = join(root, 'harness');
    const initial = join(root, 'initial');
    const module = createInstallationModule();
    const update = (projectRoot: string, version: string) => module.runReconcileUseCase.execute({ projectRoot, harnessRoot: harness, phasegateVersion: version, dryRun: false, apply: true, force: false });
    try {
      await templates(harness);
      await mkdir(initial);
      await module.manifestRepository.save(initial, DeploymentManifest.create('0.340.0').withInstallationFlags({ includeCi: false, includeHusky: false, personal: false }));
      await update(initial, '0.340.0');
      await update(initial, '0.340.0');
      await put(initial, 'user-notes.md', 'User notes.\n');
      await put(harness, 'templates/.codex/hooks.json', '{"hooks":{"PreToolUse":[{"command":"phasegate hook pre-tool-use"}]}}\n');
      await put(harness, 'docs/templates/agent-context/AGENTS.md.template.md', '<!-- phasegate:managed-section:start -->\nUpdated instructions.\n<!-- phasegate:managed-section:end -->\n');

      const baseline = join(root, 'baseline');
      await cp(initial, baseline, { recursive: true, verbatimSymlinks: true });
      fault.root = baseline; fault.trace = []; fault.count = 0; fault.index = -1;
      const clean = await update(baseline, '0.341.0');
      const boundaries = [...fault.trace];
      fault.root = '';
      expect(clean.refused).toEqual([]);
      expect(boundaries.some(item => item.startsWith('writeFile:.codex/hooks.json'))).toBe(true);
      expect(boundaries.some(item => item.startsWith('writeFile:AGENTS.md'))).toBe(true);
      expect(boundaries.at(-1)).toBe('rename:.phasegate/manifest.json');

      for (let index = 0; index < boundaries.length; index++) {
        for (const when of ['before', 'after']) {
          const project = join(root, `trial-${index}-${when}`);
          await cp(initial, project, { recursive: true, verbatimSymlinks: true });
          fault.root = project; fault.trace = []; fault.count = 0; fault.index = index; fault.when = when;
          await expect(update(project, '0.341.0')).rejects.toThrow('Injected interrupted write');
          fault.root = '';
          await put(project, 'user-notes.md', 'User notes.\nLater user edit.\n');

          const actual = await update(project, '0.341.0');
          expect(actual.refused, `${index}:${when}:${boundaries[index]}`).toEqual([]);
          expect(await readFile(join(project, 'user-notes.md'), 'utf8')).toBe('User notes.\nLater user edit.\n');
          const manifest = await module.manifestRepository.load(project);
          expect(manifest?.version).toBe('0.341.0');
          for (const path of ['.codex/hooks.json', 'AGENTS.md', 'package.json']) {
            const hash = `sha256:${createHash('sha256').update(await readFile(join(project, path))).digest('hex')}`;
            expect(manifest?.findEntry(path)?.hash.value, `${index}:${when}:${path}`).toBe(hash);
          }
          const next = await update(project, '0.342.0');
          expect(next.refused, `${index}:${when}:next-update`).toEqual([]);
        }
      }
      console.log(`Checked ${boundaries.length} write boundaries before/after: ${boundaries.join(', ')}`);
    } finally {
      fault.root = ''; fault.index = -1;
      await rm(root, { recursive: true, force: true });
    }
  }, 60000);
});
