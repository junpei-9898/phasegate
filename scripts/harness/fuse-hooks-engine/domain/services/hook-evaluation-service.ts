/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import { HookDefinition } from '../aggregates/hook-definition.js';
import type { HookEventType } from '../types/hook-event-type.js';
import { HookAction } from '../value-objects/hook-action.js';

export class HookEvaluationService {
  evaluate(filePath: string, eventType: HookEventType, definitions: HookDefinition[]): HookAction[] {
    return definitions
      .filter((definition) => definition.matches(filePath, eventType))
      .map((definition) => definition.getAction());
  }
}
