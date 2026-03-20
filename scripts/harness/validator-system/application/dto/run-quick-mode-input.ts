/**
 * @layer application
 * @unit validator-system
 *
 * RunQuickModeInput — H08-04 UseCase入力DTO
 */
import type { ValidatorRelaxationProfile } from './validator-relaxation-profile.js';

export interface RunQuickModeInput {
  readonly relaxationProfile: ValidatorRelaxationProfile;
  readonly targetPaths: readonly string[];
  readonly unitName: string;
  readonly currentPhase: string;
}
