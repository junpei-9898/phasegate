/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import type { HookEventType } from '../types/hook-event-type.js';

export interface FuseHandlers {
  handle(filePath: string, eventType: HookEventType): Promise<void>;
}

export interface FuseHandlerPort {
  register(mountPath: string, handlers: FuseHandlers): Promise<void>;
  dispatch?(mountPath: string, filePath: string, eventType: HookEventType): Promise<void>;
}
