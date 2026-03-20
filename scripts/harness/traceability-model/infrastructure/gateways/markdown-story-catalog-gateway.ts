/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * user_stories.md を読み込み StoryCatalogPort を実装するゲートウェイ
 */
import { readFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import type { StoryCatalogPort } from '../../domain/ports/story-catalog-port.js';
import type { StoryIdLike } from '../../domain/value-objects/story-reference.js';
import { StoryId } from '../../domain/value-objects/story-id.js';
import { parseStoryCatalog } from '../parsers/story-catalog-parser.js';

export interface MarkdownStoryCatalogGatewayDeps {
  readonly rootDir: string;
}

export class MarkdownStoryCatalogGateway implements StoryCatalogPort {
  private readonly rootDir: string;
  private cachedStoryIds: readonly StoryIdLike[] | null = null;
  private cachedAliasMap: ReadonlyMap<string, StoryIdLike> | null = null;
  private cachedMtime: number | null = null;

  constructor(deps: MarkdownStoryCatalogGatewayDeps) {
    this.rootDir = deps.rootDir;
  }

  async getAllStoryIds(): Promise<readonly StoryIdLike[]> {
    await this.ensureLoaded();
    return this.cachedStoryIds!;
  }

  async getAliasMap(): Promise<ReadonlyMap<string, StoryIdLike>> {
    await this.ensureLoaded();
    return this.cachedAliasMap!;
  }

  async hasStoryId(
    storyId: StoryIdLike | { readonly value: string } | string,
  ): Promise<boolean> {
    const ids = await this.getAllStoryIds();
    const value = typeof storyId === 'string' ? storyId : storyId.value;
    return ids.some((id) => id.value === value);
  }

  async exists(storyId: StoryIdLike): Promise<boolean> {
    return this.hasStoryId(storyId);
  }

  private async ensureLoaded(): Promise<void> {
    const filePath = path.join(
      this.rootDir,
      'docs',
      'product',
      'user_stories.md',
    );

    let currentMtime: number;
    try {
      const fileStat = await stat(filePath);
      currentMtime = fileStat.mtimeMs;
    } catch {
      this.cachedStoryIds = Object.freeze([]);
      this.cachedAliasMap = new Map();
      this.cachedMtime = null;
      return;
    }

    if (this.cachedMtime !== null && this.cachedMtime === currentMtime) {
      return;
    }

    const content = await readFile(filePath, 'utf8');
    const parsed = parseStoryCatalog(content);

    const storyIds: StoryIdLike[] = [];
    for (let i = 0; i < parsed.storyIds.length; i++) {
      try {
        storyIds.push(StoryId.parse(parsed.storyIds[i]));
      } catch {
        // 不正な形式は無視する
      }
    }

    const aliasMap = new Map<string, StoryIdLike>();
    parsed.aliasMap.forEach((targetId, legacyId) => {
      try {
        aliasMap.set(legacyId, StoryId.parse(targetId));
      } catch {
        // 不正な形式は無視する
      }
    });

    this.cachedStoryIds = Object.freeze(storyIds);
    this.cachedAliasMap = aliasMap;
    this.cachedMtime = currentMtime;
  }
}
