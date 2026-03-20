/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import type { GateStatus } from '../types/gate-status.js';
import { MagicFile } from '../value-objects/magic-file.js';

export class CompletionGate {
  private constructor(
    readonly storyId: string,
    readonly magicFile: MagicFile,
    private currentStatus: GateStatus,
    private currentCheckedAt: string | null,
    private currentFailureReason: string | null,
  ) {}

  static create(storyId: string, magicFile: MagicFile): CompletionGate {
    return new CompletionGate(storyId, magicFile, 'pending', null, null);
  }

  static restore(props: {
    storyId: string;
    magicFile: MagicFile;
    status: GateStatus;
    checkedAt: string | null;
    failureReason: string | null;
  }): CompletionGate {
    return new CompletionGate(
      props.storyId,
      props.magicFile,
      props.status,
      props.checkedAt,
      props.failureReason,
    );
  }

  get status(): GateStatus {
    return this.currentStatus;
  }

  get checkedAt(): string | null {
    return this.currentCheckedAt;
  }

  get failureReason(): string | null {
    return this.currentFailureReason;
  }

  startCheck(): void {
    this.currentStatus = 'checking';
    this.currentFailureReason = null;
  }

  passed(): void {
    this.currentStatus = 'passed';
    this.currentCheckedAt = new Date().toISOString();
    this.currentFailureReason = null;
  }

  fail(reason: string): void {
    this.currentStatus = 'failed';
    this.currentFailureReason = reason;
    this.currentCheckedAt = null;
  }

  isPassed(): boolean {
    return this.currentStatus === 'passed';
  }

  canRecheck(): boolean {
    return this.currentStatus !== 'passed';
  }
}
