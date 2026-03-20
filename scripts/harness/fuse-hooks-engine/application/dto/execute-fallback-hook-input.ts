import type { FallbackMode } from '../../domain/types/fallback-mode.js';
import type { HookEventType } from '../../domain/types/hook-event-type.js';

export interface ExecuteFallbackHookInput {
  filePath: string;
  eventType: HookEventType;
  fallbackMode: FallbackMode;
}
