// @unit nyquist-validation
// @layer infrastructure
// @stub wave2-pending

import type { StoryRegistryPort } from '../../domain/ports/story-registry-port.js';

export interface TraceabilityModelStoryRegistryAdapterDeps {
  getStoryIds: () => Promise<readonly string[]>;
}

export class TraceabilityModelStoryRegistryAdapter implements StoryRegistryPort {
  private readonly getStoryIds: () => Promise<readonly string[]>;

  constructor(deps: TraceabilityModelStoryRegistryAdapterDeps) {
    this.getStoryIds = deps.getStoryIds;
  }

  async getValidStoryIds(): Promise<readonly string[]> {
    return this.getStoryIds();
  }
}
