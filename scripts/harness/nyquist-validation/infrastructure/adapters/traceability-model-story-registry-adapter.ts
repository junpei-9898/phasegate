/**
 * @layer infrastructure
 * @unit nyquist-validation
 *
 * StoryRegistryPort 実装: traceability-model アダプタ
 * @stub wave2-pending
 */
import type { StoryRegistryPort } from '../../domain/ports/story-registry-port.js';

export interface TraceabilityModelStoryRegistryAdapterDeps {
  /** traceability-model から有効なstoryIdを取得するコールバック（Wave2暫定） */
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
