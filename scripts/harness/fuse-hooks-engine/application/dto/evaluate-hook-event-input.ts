import { HookDefinition } from '../../domain/aggregates/hook-definition.js';
import type { HookEventType } from '../../domain/types/hook-event-type.js';
import type { MountStatus } from '../../domain/types/mount-status.js';

export interface EvaluateHookEventInput {
  filePath: string;
  eventType: HookEventType;
  mountStatus: MountStatus;
  definitions: HookDefinition[];
}
