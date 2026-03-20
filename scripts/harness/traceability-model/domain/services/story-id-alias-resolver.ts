/**
 * @layer domain
 * @unit traceability-model
 */

import type { StoryCatalogPort } from '../ports/story-catalog-port.js';
import type { StoryIdLike } from '../value-objects/story-reference.js';

const LEGACY_STORY_ID_PATTERN = /^US-[0-9]{3}$/;

export class StoryIdAliasResolver {
  private readonly storyCatalogPort: StoryCatalogPort;

  constructor(storyCatalogPort: StoryCatalogPort) {
    this.storyCatalogPort = storyCatalogPort;
  }

  isLegacyFormat(value: string): boolean {
    return LEGACY_STORY_ID_PATTERN.test(value.trim());
  }

  async resolve(legacyId: string): Promise<StoryIdLike | null> {
    if (!this.isLegacyFormat(legacyId)) {
      return null;
    }

    if (typeof this.storyCatalogPort.getAliasMap === 'function') {
      const aliasMap = await this.storyCatalogPort.getAliasMap();
      return aliasMap.get(legacyId) ?? null;
    }

    if (typeof this.storyCatalogPort.getLegacyStoryIdAliases === 'function') {
      const aliasMap = await this.storyCatalogPort.getLegacyStoryIdAliases();
      const resolvedValue = aliasMap[legacyId];
      if (!resolvedValue) {
        return null;
      }
      return Object.freeze({
        value: resolvedValue,
        equals(other: { readonly value: string }) {
          return other.value === resolvedValue;
        },
      });
    }

    return null;
  }
}
