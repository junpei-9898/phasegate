/**
 * @layer application
 * @unit quick-mode
 *
 * validator-system への緩和実行指示ポート
 */

import type { ValidatorRelaxationProfileContract } from '../dto/validator-relaxation-profile-contract.js';

export interface ValidatorExecutionPort {
  executeWithProfile(profile: ValidatorRelaxationProfileContract): Promise<void>;
}
