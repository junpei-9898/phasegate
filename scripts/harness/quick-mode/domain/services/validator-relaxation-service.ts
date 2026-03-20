/**
 * @layer domain
 * @unit quick-mode
 *
 * QuickModeConfigと全ValidatorId[]からValidatorRelaxationProfileを生成するドメインサービス
 */

import { ValidatorRelaxationProfile } from '../value-objects/validator-relaxation-profile.js';
import type { QuickModeConfig } from '../value-objects/quick-mode-config.js';

export class ValidatorRelaxationService {
  build(
    config: QuickModeConfig,
    allValidatorIds: readonly string[]
  ): ValidatorRelaxationProfile {
    // L2 IDの分類
    const l2Ids = allValidatorIds.filter((id) => id.startsWith('L2-'));
    const l2Maintained: string[] = [];
    const l2Skipped: string[] = [];

    for (const id of l2Ids) {
      if (config.isMaintained(id)) {
        l2Maintained.push(id);
      } else {
        l2Skipped.push(id);
      }
    }

    // L3 IDの分類
    const l3Ids = allValidatorIds.filter((id) => id.startsWith('L3-'));
    const l3Maintained: string[] = [];
    const l3Skipped: string[] = [];

    for (const id of l3Ids) {
      if (config.isMaintained(id)) {
        l3Maintained.push(id);
      } else {
        l3Skipped.push(id);
      }
    }

    return ValidatorRelaxationProfile.create({
      l2: { maintained: l2Maintained, skipped: l2Skipped },
      l3: { maintained: l3Maintained, skipped: l3Skipped },
    });
  }
}
