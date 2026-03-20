/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import { HookAction } from '../../domain/value-objects/hook-action.js';

export class FallbackPreReadAdapter {
  constructor(private readonly action: HookAction | null = null) {}

  async handlePreWrite(_filePath: string): Promise<HookAction | null> {
    return null;
  }

  async handlePreRead(_filePath: string): Promise<HookAction | null> {
    return this.action;
  }
}
