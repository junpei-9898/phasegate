/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import type { FuseHandlers } from '../../domain/ports/fuse-handler-port.js';
import type { HookEventType } from '../../domain/types/hook-event-type.js';

export class FusePreWriteHandlerAdapter {
  private readonly handlers = new Map<string, FuseHandlers>();

  async register(mountPath: string, handlers: FuseHandlers): Promise<void> {
    this.handlers.set(mountPath, handlers);
  }

  async dispatch(mountPath: string, filePath: string, eventType: HookEventType): Promise<void> {
    const handler = this.handlers.get(mountPath);
    if (handler) {
      await handler.handle(filePath, eventType);
    }
  }
}
