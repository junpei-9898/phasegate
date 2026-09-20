// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-223
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';
import { getBundledSkillsForSet, resolveInstalledSkillSet } from '../../../installation/application/bundled-skill-selection.js';
import { phasegateSkillDirectoryLooksComplete } from '../../../installation/application/checks/check-utils.js';
import { createInstallationModule } from '../../../installation/composition-root.js';
import { getSkillsForSet } from '../../../setup/skill-deployer.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

it('利用者向けセットは既存の全セットから本体専用の二件だけを除く', () => {
  // Arrange
  const all = getBundledSkillsForSet('all');
  // Act
  const actual = getBundledSkillsForSet('consumer');
  // Assert
  expect(all).toHaveLength(29);
  expect(getBundledSkillsForSet('core')).toEqual([
    'cascade-updater', 'codebase-mapper', 'consistency-checker', 'doc-health-checker',
    'engineering-perspective', 'implementation-readiness-checker', 'test-coverage-checker',
  ]);
  expect(actual).toEqual(all.filter(name => !['release-publisher', 'skill-creator'].includes(name)));
  expect(getSkillsForSet('consumer')).toEqual(actual);
  expect(getSkillsForSet('all')).toEqual(all);
  actual.pop();
  expect(getBundledSkillsForSet('consumer')).toHaveLength(27);
});

it.each(['core', 'consumer', 'all'] as const)('保存された配布選択をJSONの空白に依存せず認識する: %s', skillSet => {
  // Arrange
  const metadata = JSON.stringify({ skillSet });
  const files = getBundledSkillsForSet(skillSet).map(name => `skills/${name}/SKILL.md`);
  // Act
  const actual = resolveInstalledSkillSet(metadata);
  // Assert
  expect(actual).toBe(skillSet);
  expect(phasegateSkillDirectoryLooksComplete(files, metadata)).toBe(true);
});

it.each([null, '', '{', '{}', '{"skillSet":"future"}', '[]'])('配布記録が解決できなければ従来の全セットを維持する: %s', metadata => {
  // Arrange / Act
  const actual = resolveInstalledSkillSet(metadata);
  // Assert
  expect(actual).toBe('all');
});

it.each([
  [false, 'consumer'], [true, 'consumer'], [false, 'core'], [true, 'core'], [false, 'all'],
] as const)('再配置で選択を維持し利用者のスキルを消さない: personal=%s set=%s', async (personal, skillSet) => {
  // Arrange
  const root = await mkdtemp(join(tmpdir(), 'phasegate-consumer-skills-'));
  roots.push(root);
  const mod = createInstallationModule();
  const input = { projectRoot: root, harnessRoot: resolve('.'), phasegateVersion: '0.340.0',
    dryRun: false, apply: true, force: false, json: true, agent: 'claude' as const,
    personal, skillSet, includeHusky: false, includeCi: false };
  const installed = await mod.installHandler.execute(input);
  expect(installed.exitCode).toBe(0);
  const skillRoot = join(root, personal ? '.claude/skills' : 'skills');
  await mkdir(join(skillRoot, 'user-skill'));
  await writeFile(join(skillRoot, 'user-skill/SKILL.md'), 'user-owned');
  const before = await readFile(join(skillRoot, '.harness-version'), 'utf8');
  const manifestBefore = await readFile(join(root, '.phasegate/manifest.json'), 'utf8');
  const preview = await mod.reconcileHandler.execute({ ...input, dryRun: true, apply: false });
  expect(preview.exitCode).toBe(0);
  expect(await readFile(join(skillRoot, '.harness-version'), 'utf8')).toBe(before);
  expect(await readFile(join(root, '.phasegate/manifest.json'), 'utf8')).toBe(manifestBefore);
  // Act
  const actual = await mod.reconcileHandler.execute(input);
  // Assert
  expect(actual.exitCode).toBe(0);
  expect(JSON.parse(await readFile(join(skillRoot, '.harness-version'), 'utf8')).skillSet).toBe(skillSet);
  if (skillSet === 'consumer') {
    expect(await readdir(skillRoot)).not.toContain('release-publisher');
    expect(await readdir(skillRoot)).not.toContain('skill-creator');
  }
  expect((await readdir(skillRoot)).filter(n => !n.startsWith('.')).sort())
    .toEqual([...getBundledSkillsForSet(skillSet), 'user-skill'].sort());
  expect(await readFile(join(skillRoot, 'user-skill/SKILL.md'), 'utf8')).toBe('user-owned');
}, 60000);

it.each(['init', 'install'] as const)('実CLIが利用者向けセットを配置する: %s', async command => {
  // Arrange
  const root = await mkdtemp(join(tmpdir(), 'phasegate-consumer-cli-'));
  roots.push(root);
  const flags = command === 'init' ? ['--yes', '--name', 'consumer-fixture'] : ['--apply', '--json'];
  // Act
  const actual = spawnSync(process.execPath, ['--import', resolve('node_modules/tsx/dist/loader.mjs'),
    resolve('scripts/harness/main.ts'), command, '--skills', 'consumer', '--agent', 'claude', ...flags],
  { cwd: root, encoding: 'utf8', timeout: 30000 });
  // Assert
  expect(actual.status, actual.stderr + actual.stdout).toBe(0);
  expect((await readdir(join(root, 'skills'))).filter(n => !n.startsWith('.')).sort())
    .toEqual(getBundledSkillsForSet('consumer').sort());
}, 40000);

it.each(['init', 'install'] as const)('実CLIは未知のセットを配置せず拒否する: %s', async command => {
  // Arrange
  const root = await mkdtemp(join(tmpdir(), 'phasegate-invalid-skill-set-'));
  roots.push(root);
  // Act
  const actual = spawnSync(process.execPath, ['--import', resolve('node_modules/tsx/dist/loader.mjs'),
    resolve('scripts/harness/main.ts'), command, '--skills', 'unknown'],
  { cwd: root, encoding: 'utf8', timeout: 30000 });
  // Assert
  expect(actual.status).toBe(2);
  expect(actual.stderr).toContain('Invalid --skills value');
  expect(await readdir(root)).not.toContain('skills');
}, 40000);
