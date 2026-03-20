/**
 * @layer application
 * @unit skill-quality
 */
import type { CascadeUpdateResult } from '../../domain/value-objects/cascade-update-result.js';
import type { ApplyCascadeUpdateOutput } from '../dto/apply-cascade-update-output.js';

export class CascadeUpdateResultMapper {
  static toOutput(result: CascadeUpdateResult): ApplyCascadeUpdateOutput {
    return {
      updatedCount: result.updatedCount,
      appliedStoryIds: result.appliedStoryIds,
      errors: result.errors,
    };
  }
}
