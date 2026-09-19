// @unit phase-dependency-model
// @layer domain
// @work-item-id WI-220

export interface WorkItemDependencyRecord {
  readonly id: string;
  readonly unitIds: readonly string[];
  /** Missing is unknown; an explicit empty list declares no dependencies. */
  readonly dependsOn?: readonly string[];
}

export type WorkItemScopeUnknownCode =
  | 'NO_TARGET' | 'INVALID_ID' | 'MISSING_WORK_ITEM' | 'DUPLICATE_ID'
  | 'UNIT_MISMATCH' | 'UNKNOWN_UNITS' | 'UNDECLARED_DEPENDENCIES';

export type WorkItemReflectionScope =
  | { readonly status: 'complete'; readonly workItems: readonly WorkItemDependencyRecord[] }
  | { readonly status: 'unknown'; readonly code: WorkItemScopeUnknownCode; readonly workItemId?: string };

/** Resolves declared dependencies only; it does not authenticate a session or approve design meaning. */
export class WorkItemReflectionScopeResolver {
  resolve(
    unitId: string,
    targetIds: readonly string[],
    catalog: readonly WorkItemDependencyRecord[],
  ): WorkItemReflectionScope {
    const unknown = (code: WorkItemScopeUnknownCode, workItemId?: string): WorkItemReflectionScope =>
      ({ status: 'unknown', code, workItemId });
    if (targetIds.length === 0) return unknown('NO_TARGET');

    const byId = new Map<string, WorkItemDependencyRecord[]>();
    for (const item of catalog) {
      const matches = byId.get(item.id);
      if (matches) matches.push(item);
      else byId.set(item.id, [item]);
    }

    const roots = new Set(targetIds);
    const pending = [...roots].sort();
    const visited = new Map<string, WorkItemDependencyRecord>();
    // Iteration, rather than recursive traversal, also bounds work for cycles.
    for (let index = 0; index < pending.length; index++) {
      const id = pending[index];
      if (visited.has(id)) continue;
      if (!/^WI-\d+$/.test(id)) return unknown('INVALID_ID', id);
      const matches = byId.get(id);
      if (!matches) return unknown('MISSING_WORK_ITEM', id);
      if (matches.length !== 1) return unknown('DUPLICATE_ID', id);
      const item = matches[0];
      if (item.unitIds.length === 0 || item.unitIds.some((unit) => !unit.trim() || unit.startsWith('_'))) {
        return unknown('UNKNOWN_UNITS', id);
      }
      if (roots.has(id) && !item.unitIds.includes(unitId)) return unknown('UNIT_MISMATCH', id);
      if (item.dependsOn === undefined) return unknown('UNDECLARED_DEPENDENCIES', id);
      visited.set(id, item);
      for (const dependency of new Set(item.dependsOn)) pending.push(dependency);
    }

    return {
      status: 'complete',
      workItems: [...visited.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    };
  }
}
