// @story H02-05
// @unit phase-dependency-model
// @layer domain
// @work-item-id WI-220
import { describe, expect, it } from 'vitest';
import { WorkItemReflectionScopeResolver, type WorkItemDependencyRecord } from '../../../phase-dependency-model/domain/services/work-item-reflection-scope-resolver.js';

const record = (id: string, dependsOn: readonly string[] | undefined = [], unitIds: readonly string[] = ['sample']): WorkItemDependencyRecord => ({ id, dependsOn, unitIds });

describe('対象WIの宣言された共有依存を解決する', () => {
  it('無関係WIを除外し別Unitへの推移依存を保持すること', () => {
    // Arrange
    const catalog = [record('WI-1', ['WI-2']), record('WI-2', ['WI-3'], ['shared']), record('WI-3'), { id: 'WI-4', unitIds: ['sample'] }];
    // Act
    const actual = new WorkItemReflectionScopeResolver().resolve('sample', ['WI-1'], catalog);
    // Assert
    expect(actual).toEqual({ status: 'complete', workItems: catalog.slice(0, 3) });
  });

  it('循環と重複した依存や対象を一度ずつ評価すること', () => {
    const catalog = [record('WI-2', ['WI-1']), record('WI-1', ['WI-2', 'WI-2'])];
    const actual = new WorkItemReflectionScopeResolver().resolve('sample', ['WI-1', 'WI-2', 'WI-1'], catalog);
    expect(actual).toEqual({ status: 'complete', workItems: [catalog[1], catalog[0]] });
  });

  it('明示された依存なしを完全な宣言として扱うこと', () => {
    const item = record('WI-1');
    const actual = new WorkItemReflectionScopeResolver().resolve('sample', ['WI-1'], [item]);
    expect(actual).toEqual({ status: 'complete', workItems: [item] });
  });

  it.each([
    { name: '対象がない', roots: [], catalog: [], code: 'NO_TARGET', id: undefined },
    { name: '対象IDが不正', roots: ['../WI-1'], catalog: [], code: 'INVALID_ID', id: '../WI-1' },
    { name: '対象WIがない', roots: ['WI-1'], catalog: [], code: 'MISSING_WORK_ITEM', id: 'WI-1' },
    { name: '対象IDが重複', roots: ['WI-1'], catalog: [record('WI-1'), record('WI-1')], code: 'DUPLICATE_ID', id: 'WI-1' },
    { name: '対象Unitが異なる', roots: ['WI-1'], catalog: [record('WI-1', [], ['other'])], code: 'UNIT_MISMATCH', id: 'WI-1' },
    { name: '対象の所属がない', roots: ['WI-1'], catalog: [record('WI-1', [], [])], code: 'UNKNOWN_UNITS', id: 'WI-1' },
    { name: '対象の依存が未宣言', roots: ['WI-1'], catalog: [{ id: 'WI-1', unitIds: ['sample'] }], code: 'UNDECLARED_DEPENDENCIES', id: 'WI-1' },
    { name: '依存先がない', roots: ['WI-1'], catalog: [record('WI-1', ['WI-2'])], code: 'MISSING_WORK_ITEM', id: 'WI-2' },
    { name: '依存先IDが不正', roots: ['WI-1'], catalog: [record('WI-1', ['../WI-2'])], code: 'INVALID_ID', id: '../WI-2' },
    { name: '依存先IDが重複', roots: ['WI-1'], catalog: [record('WI-1', ['WI-2']), record('WI-2'), record('WI-2')], code: 'DUPLICATE_ID', id: 'WI-2' },
    { name: '依存先の所属が不明', roots: ['WI-1'], catalog: [record('WI-1', ['WI-2']), record('WI-2', [], [])], code: 'UNKNOWN_UNITS', id: 'WI-2' },
    { name: '推移依存先が未宣言', roots: ['WI-1'], catalog: [record('WI-1', ['WI-2']), record('WI-2', ['WI-3']), { id: 'WI-3', unitIds: ['shared'] }], code: 'UNDECLARED_DEPENDENCIES', id: 'WI-3' },
  ])('$nameの場合は不明理由だけを返し部分集合を許可根拠にしないこと', ({ roots, catalog, code, id }) => {
    const actual = new WorkItemReflectionScopeResolver().resolve('sample', roots, catalog);
    expect(actual).toEqual({ status: 'unknown', code, workItemId: id });
    expect(actual).not.toHaveProperty('workItems');
  });

  it('catalogと依存の順序が異なっても同じ集合順を返すこと', () => {
    const catalog = [record('WI-3'), record('WI-1', ['WI-3', 'WI-2']), record('WI-2')];
    const actual = new WorkItemReflectionScopeResolver().resolve('sample', ['WI-1'], catalog);
    expect(actual).toEqual({ status: 'complete', workItems: [catalog[1], catalog[2], catalog[0]] });
  });

  it('深い推移依存でも再帰の上限に依存せず全対象を保持すること', () => {
    const catalog = Array.from({ length: 15000 }, (_, index) => record(`WI-${index}`, index < 14999 ? [`WI-${index + 1}`] : []));
    const actual = new WorkItemReflectionScopeResolver().resolve('sample', ['WI-0'], catalog);
    expect(actual).toEqual({ status: 'complete', workItems: [...catalog].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) });
  });
});
