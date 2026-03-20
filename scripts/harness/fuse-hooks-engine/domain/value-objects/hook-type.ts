/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import type { HookEventType } from '../types/hook-event-type.js';
import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { Result } from '../result.js';

const values = ['pre-write', 'post-write', 'pre-read', 'on-complete'] as const;
type HookTypeValue = (typeof values)[number];

export class HookType {
  private constructor(readonly value: HookTypeValue) {}

  static create(value: string) {
    if (!values.includes(value as HookTypeValue)) {
      return Result.err(
        new FuseHooksEngineDomainError('HOOK_INVALID_TYPE', `Invalid hook type: ${value}`),
      );
    }
    return Result.ok(new HookType(value as HookTypeValue));
  }

  matchesEvent(eventType: HookEventType): boolean {
    if (this.value === 'pre-read') {
      return eventType === 'read';
    }
    return eventType === 'write';
  }

  equals(other: HookType): boolean {
    return this.value === other.value;
  }
}
