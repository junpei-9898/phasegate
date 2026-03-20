/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import type { FallbackMode } from '../types/fallback-mode.js';
import type { MountStatus } from '../types/mount-status.js';

export class FUSEMount {
  private constructor(
    readonly mountPath: string,
    private currentStatus: MountStatus,
    private fallbackMode: FallbackMode | null,
    private mountOptions: Record<string, unknown> | null,
  ) {}

  static create(mountPath: string): FUSEMount {
    return new FUSEMount(mountPath, 'unmounted', null, null);
  }

  get status(): MountStatus {
    return this.currentStatus;
  }

  mount(options: Record<string, unknown> = {}): void {
    this.currentStatus = 'mounted';
    this.mountOptions = { ...options };
    this.fallbackMode = null;
  }

  enterFallback(mode: FallbackMode): void {
    this.currentStatus = 'fallback';
    this.fallbackMode = mode;
  }

  isMounted(): boolean {
    return this.currentStatus === 'mounted';
  }

  isFallback(): boolean {
    return this.currentStatus === 'fallback';
  }

  getFallbackMode(): FallbackMode | null {
    return this.fallbackMode;
  }
}
