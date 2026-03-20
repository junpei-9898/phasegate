import type { GateStatus } from '../../domain/types/gate-status.js';
import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';

export interface CheckCompletionGateOutput {
  gateStatus: GateStatus;
  checkedAt: string | null;
  failureReason: string | null;
  errors: FuseHooksEngineDomainError[];
}
