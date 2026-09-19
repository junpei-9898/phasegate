// @unit phase-dependency-model
// @layer infrastructure
// @work-item-id WI-220
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import type { WorkItemDependencyRecord } from '../../domain/services/work-item-reflection-scope-resolver.js';
import type { WorkItemFrontmatter } from '../../../traceability-model/domain/value-objects/work-item-frontmatter.js';
import { parseWorkItemDependencies, parseWorkItemFrontmatter } from '../../../traceability-model/infrastructure/parsers/work-item-frontmatter-parser.js';

export interface WorkItemDependencyCatalogEntry extends WorkItemDependencyRecord {
  readonly descriptionPath: string;
  readonly metadata?: WorkItemFrontmatter;
  readonly diagnostic?: string;
}

interface IndexedDescription {
  readonly owner: string;
  readonly path: string;
}

/** Directory index is global, document reads are limited to reachable WI IDs. */
export class FileSystemWorkItemDependencyCatalog {
  constructor(private readonly options: { rootDir: string; inceptionRoot?: string }) {}

  async load(targetIds: readonly string[]): Promise<readonly WorkItemDependencyCatalogEntry[]> {
    const root = resolve(this.options.rootDir, this.options.inceptionRoot ?? 'docs/inception');
    const index = new Map<string, IndexedDescription[]>();
    const owners = await readdir(root, { withFileTypes: true });
    for (const owner of owners.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!owner.isDirectory() || owner.name.startsWith('.') || (owner.name.startsWith('_') && owner.name !== '_cross')) continue;
      const entries = await readdir(join(root, owner.name), { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !/^WI-\d+$/.test(entry.name)) continue;
        const descriptions = index.get(entry.name) ?? [];
        descriptions.push({ owner: owner.name, path: join(root, owner.name, entry.name, 'description.md') });
        index.set(entry.name, descriptions);
      }
    }

    const pending = [...new Set(targetIds)].sort();
    const visited = new Set<string>();
    const result: WorkItemDependencyCatalogEntry[] = [];
    for (let cursor = 0; cursor < pending.length; cursor++) {
      const id = pending[cursor];
      if (visited.has(id)) continue;
      visited.add(id);
      // Only indexed paths are read; an input ID is never used to construct a path.
      for (const description of index.get(id) ?? []) {
        const entry = await this.readEntry(id, description);
        result.push(entry);
        for (const dependency of entry.dependsOn ?? []) pending.push(dependency);
      }
    }
    return result;
  }

  private async readEntry(id: string, description: IndexedDescription): Promise<WorkItemDependencyCatalogEntry> {
    const descriptionPath = relative(this.options.rootDir, description.path).split(sep).join('/');
    try {
      const content = await readFile(description.path, 'utf8');
      const metadata = parseWorkItemFrontmatter(content);
      if (metadata === null || metadata.id !== id) throw new Error('WI frontmatter id must match its directory');
      const dependsOn = parseWorkItemDependencies(content);
      const unitIds = metadata.affects ?? (description.owner === '_cross' ? [] : [description.owner]);
      if (unitIds.length === 0 || unitIds.some((unit) => !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(unit))) {
        throw new Error('WI owner/affects must identify actual Units');
      }
      return { id, unitIds, dependsOn, descriptionPath, metadata };
    } catch (error) {
      return { id, unitIds: [], descriptionPath, diagnostic: error instanceof Error ? error.message : String(error) };
    }
  }
}
