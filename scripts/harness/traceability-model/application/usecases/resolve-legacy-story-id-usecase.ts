/**
 * @layer application
 * @unit traceability-model
 */

import type { StoryIdAliasResolver } from '../../domain/services/story-id-alias-resolver.js';
import { StoryId } from '../../domain/value-objects/story-id.js';

type LegacyStoryIdResolver = Pick<StoryIdAliasResolver, 'isLegacyFormat' | 'resolve'>;

export interface ResolveLegacyStoryIdUseCaseDeps {
  readonly resolver: LegacyStoryIdResolver;
}

export class ResolveLegacyStoryIdUseCase {
  private readonly resolver: LegacyStoryIdResolver;

  constructor(deps: ResolveLegacyStoryIdUseCaseDeps) {
    this.resolver = deps.resolver;
  }

  async execute(legacyId: string): Promise<StoryId | null> {
    if (!this.resolver.isLegacyFormat(legacyId)) {
      return null;
    }

    const resolved = await this.resolver.resolve(legacyId);
    if (resolved === null) {
      return null;
    }

    return StoryId.parse(resolved.value);
  }
}
