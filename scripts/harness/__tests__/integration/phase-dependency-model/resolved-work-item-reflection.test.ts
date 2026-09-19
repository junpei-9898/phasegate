// @story H02-05
// @unit phase-dependency-model
// @layer infrastructure
// @work-item-id WI-220
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StoryReflectionChecker } from '../../../phase-dependency-model/domain/services/story-reflection-checker.js';
import { WorkItemReflectionScopeResolver } from '../../../phase-dependency-model/domain/services/work-item-reflection-scope-resolver.js';
import { StoryReflectionConfig } from '../../../phase-dependency-model/domain/values/story-reflection-config.js';
import { StoryReflectionMapping } from '../../../phase-dependency-model/domain/values/story-reflection-mapping.js';
import { FileSystemStoryReflectionAdapter } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js';
import { FileSystemWorkItemDependencyCatalog } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-work-item-dependency-catalog.js';

let rootDir: string;
beforeEach(async () => { rootDir = await mkdtemp(join(tmpdir(), 'wi220-reflection-')); });
afterEach(async () => { await rm(rootDir, { recursive: true, force: true }); });

async function put(path: string, content: string) {
  const absolute = join(rootDir, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}
async function wi(owner: string, id: string, dependencies: string[], affects?: string[]) {
  await put(`docs/inception/${owner}/${id}/description.md`,
    `---\nid: ${id}\ntype: refactor\nseverity: normal\nstatus: drafted\ndepends_on: [${dependencies.join(', ')}]\n${affects ? `affects: [${affects.join(', ')}]\n` : ''}---\n`);
  await put(`docs/inception/${owner}/${id}/logical_design.md`, '# Design');
}
const product = (unit: string, category = 'logical_design') => `docs/product/construction/${unit}/${category}.md`;
function config(category = 'logical_design', required = true) {
  return StoryReflectionConfig.create({ enabled: true, mappings: [StoryReflectionMapping.create({
    inception: `docs/inception/{unit}/{storyId}/${category}.md`,
    product: `docs/product/construction/{unit}/${category}.md`, required,
  })] });
}
function checker() { return new StoryReflectionChecker(new FileSystemStoryReflectionAdapter({ rootDir })); }
async function scope() {
  const catalog = await new FileSystemWorkItemDependencyCatalog({ rootDir }).load(['WI-1']);
  const resolved = new WorkItemReflectionScopeResolver().resolve('order', ['WI-1'], catalog);
  if (resolved.status !== 'complete') throw new Error(`Unexpected fixture scope: ${resolved.code}`);
  return resolved;
}

describe('解決済みWIの反映検査', () => {
  it('対象が反映済みなら無関係な下書きを除外し、旧検査は従来の違反を保持すること', async () => {
    await wi('order', 'WI-1', []);
    await wi('order', 'WI-9', []);
    await put(product('order'), '<!-- @work-item-id WI-1 -->');
    const resolved = await scope();
    const sut = checker();
    const actual = await sut.checkResolvedScope(resolved, config());
    expect(actual).toMatchObject({ passed: true, violations: [], warnings: [] });
    const legacy = await sut.check('order', config());
    expect(legacy.violations.map(v => v.storyId)).toEqual(['WI-9']);
  });

  it('対象自身の未反映を検出すること', async () => {
    await wi('order', 'WI-1', []);
    const resolved = await scope();
    const actual = await checker().checkResolvedScope(resolved, config());
    expect(actual.passed).toBe(false);
    expect(actual.violations.map(v => [v.storyId, v.productPath])).toEqual([['WI-1', product('order')]]);
  });

  it('別Unitの直接・推移依存を検出し、反映後の再評価では解消すること', async () => {
    await wi('order', 'WI-1', ['WI-2']);
    await wi('shared', 'WI-2', ['WI-3']);
    await wi('storage', 'WI-3', []);
    await put(product('order'), '<!-- @work-item-id WI-1 -->');
    const resolved = await scope();
    const sut = checker();
    const actual = await sut.checkResolvedScope(resolved, config());
    expect(actual.violations.map(v => [v.storyId, v.productPath])).toEqual([
      ['WI-2', product('shared')], ['WI-3', product('storage')],
    ]);
    await put(product('shared'), '<!-- @work-item-id WI-2 -->');
    await put(product('storage'), '<!-- @work-item-id WI-3 -->');
    const resumed = await sut.checkResolvedScope(await scope(), config());
    expect(resumed).toMatchObject({ passed: true, violations: [], warnings: [] });
  });

  it('cross依存の全所属先を確認し、Git履歴がなくてもdomain未反映を省かないこと', async () => {
    await wi('order', 'WI-1', ['WI-2']);
    await wi('_cross', 'WI-2', [], ['shared', 'storage']);
    await put('docs/inception/_cross/WI-2/domain_model.md', '# Shared contract');
    await put(product('shared', 'domain_model'), '<!-- @work-item-id WI-2 -->');
    const resolved = await scope();
    const actual = await checker().checkResolvedScope(resolved, config('domain_model'));
    expect(actual.violations.map(v => [v.storyId, v.productPath])).toEqual([
      ['WI-2', product('storage', 'domain_model')],
    ]);
  });

  it('任意反映の不足は警告として保持すること', async () => {
    await wi('order', 'WI-1', []);
    const resolved = await scope();
    const actual = await checker().checkResolvedScope(resolved, config('logical_design', false));
    expect(actual.passed).toBe(true);
    expect(actual.violations).toEqual([]);
    expect(actual.warnings.map(v => v.storyId)).toEqual(['WI-1']);
  });

  it('同じWIと所属の重複で違反を水増ししないこと', async () => {
    await wi('order', 'WI-1', []);
    const resolved = await scope();
    const repeated = { ...resolved, workItems: [...resolved.workItems, { ...resolved.workItems[0], unitIds: ['order', 'order'] }] };
    const actual = await checker().checkResolvedScope(repeated, config());
    expect(actual.violations.map(v => v.storyId)).toEqual(['WI-1']);
  });

  it('空の対象集合を検査成功としないこと', async () => {
    const actual = checker().checkResolvedScope({ status: 'complete', workItems: [] }, config());
    await expect(actual).rejects.toThrow('Resolved reflection scope must not be empty');
  });

  it('無効設定では対象を読み取らず成功すること', async () => {
    const fail = async (): Promise<never> => { throw new Error('Unexpected I/O'); };
    const sut = new StoryReflectionChecker({ listStoryDirectories: fail, storyAffectsUnit: fail,
      storyTouchesUnitLayer: fail, fileExists: fail, fileContainsStoryAnnotation: fail });
    const actual = await sut.checkResolvedScope({ status: 'complete', workItems: [] }, StoryReflectionConfig.disabled());
    expect(actual).toMatchObject({ passed: true, violations: [], warnings: [] });
  });
});
