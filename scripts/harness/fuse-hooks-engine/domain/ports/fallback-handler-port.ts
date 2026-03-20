/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import { HookAction } from '../value-objects/hook-action.js';

export interface FallbackHandlerPort {
  handlePreWrite(filePath: string): Promise<HookAction | null>;
  handlePreRead(filePath: string): Promise<HookAction | null>;
}
