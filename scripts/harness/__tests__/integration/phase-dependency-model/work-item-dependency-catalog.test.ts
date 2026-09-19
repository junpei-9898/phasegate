// @story H02-05
// @unit phase-dependency-model
// @layer integration-test
// @work-item-id WI-220
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileSystemWorkItemDependencyCatalog } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-work-item-dependency-catalog.js';
import { WorkItemReflectionScopeResolver } from '../../../phase-dependency-model/domain/services/work-item-reflection-scope-resolver.js';

describe('実文書から対象WIの依存だけを解決する', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'wi-dependencies-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });
  async function wi(owner: string, id: string, declaration = 'depends_on: []', inception = 'docs/inception') {
    const directory = join(root, inception, owner, id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'description.md'), `---\nid: ${id}\ntype: refactor\n${declaration}\n---\n# Design\n`);
    return directory;
  }
  const resolveScope = (catalog: Parameters<WorkItemReflectionScopeResolver['resolve']>[2]) =>
    new WorkItemReflectionScopeResolver().resolve('sample', ['WI-1'], catalog);

  it('無関係な破損文書を読まず別Unitとcrossへの推移依存を保持すること', async () => {
    await wi('sample', 'WI-1', 'depends_on: [WI-2]');
    await wi('_cross', 'WI-2', 'affects: [sample, shared]\ndepends_on: [WI-3]');
    await wi('shared', 'WI-3');
    const unrelated = await wi('sample', 'WI-9');
    await writeFile(join(unrelated, 'description.md'), 'broken metadata');
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1']);
    expect(actual.map((item) => ({ id: item.id, units: item.unitIds, dependsOn: item.dependsOn }))).toEqual([
      { id: 'WI-1', units: ['sample'], dependsOn: ['WI-2'] },
      { id: 'WI-2', units: ['sample', 'shared'], dependsOn: ['WI-3'] },
      { id: 'WI-3', units: ['shared'], dependsOn: [] },
    ]);
    expect(resolveScope(actual).status).toBe('complete');
  });

  it('依存未宣言を空集合へ変換しないこと', async () => {
    await wi('sample', 'WI-1', '');
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1']);
    expect(resolveScope(actual)).toEqual({ status: 'unknown', code: 'UNDECLARED_DEPENDENCIES', workItemId: 'WI-1' });
  });

  it('別directoryの重複IDを消さず不明とすること', async () => {
    await wi('sample', 'WI-1');
    await wi('other', 'WI-1');
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1']);
    expect(resolveScope(actual)).toEqual({ status: 'unknown', code: 'DUPLICATE_ID', workItemId: 'WI-1' });
  });

  it.each([
    ['破損frontmatter', 'not metadata'],
    ['IDとdirectoryの不一致', '---\nid: WI-99\ntype: refactor\ndepends_on: []\n---'],
    ['不正な依存宣言', '---\nid: WI-1\ntype: refactor\ndepends_on: *unknown\n---'],
  ])('%sは当該WIの診断付き不明として保持すること', async (_name, content) => {
    const directory = await wi('sample', 'WI-1');
    await writeFile(join(directory, 'description.md'), content);
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1']);
    expect(actual[0].diagnostic).toEqual(expect.any(String));
    expect(actual[0].diagnostic?.length).toBeGreaterThan(0);
    expect(resolveScope(actual)).toEqual({ status: 'unknown', code: 'UNKNOWN_UNITS', workItemId: 'WI-1' });
  });

  it('依存先descriptionの欠落を無視しないこと', async () => {
    await wi('sample', 'WI-1', 'depends_on: [WI-2]');
    await mkdir(join(root, 'docs/inception/shared/WI-2'), { recursive: true });
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1']);
    expect(actual[1].diagnostic).toContain('ENOENT');
    expect(resolveScope(actual)).toEqual({ status: 'unknown', code: 'UNKNOWN_UNITS', workItemId: 'WI-2' });
  });

  it('循環していても同じ文書を増やし続けないこと', async () => {
    await wi('sample', 'WI-1', 'depends_on: [WI-2]');
    await wi('shared', 'WI-2', 'depends_on: [WI-1]');
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1', 'WI-1']);
    expect(actual.map((item) => item.id)).toEqual(['WI-1', 'WI-2']);
    expect(resolveScope(actual).status).toBe('complete');
  });

  it('設定されたinception rootだけを読むこと', async () => {
    await wi('sample', 'WI-1', 'depends_on: []', 'design/inception');
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root, inceptionRoot: 'design/inception' }).load(['WI-1']);
    expect(actual[0].descriptionPath).toBe('design/inception/sample/WI-1/description.md');
    expect(resolveScope(actual).status).toBe('complete');
  });

  it('外部を指すsymlink directoryをWIの実体として追跡しないこと', async () => {
    const target = await wi('outside', 'WI-1', 'depends_on: []', 'other');
    const unit = join(root, 'docs/inception/sample');
    await mkdir(unit, { recursive: true });
    await symlink(target, join(unit, 'WI-1'), 'dir');
    const actual = await new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1']);
    expect(resolveScope(actual)).toEqual({ status: 'unknown', code: 'MISSING_WORK_ITEM', workItemId: 'WI-1' });
  });

  it('索引rootを読めない場合は空catalog成功にしないこと', async () => {
    const actual = new FileSystemWorkItemDependencyCatalog({ rootDir: root }).load(['WI-1']);
    await expect(actual).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
