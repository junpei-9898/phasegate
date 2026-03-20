/**
 * @layer domain
 * @unit ci-governance
 *
 * TemplateGeneratorドメインサービス
 */

import type { ValidatorIdRegistryPort } from '../ports/validator-id-registry-port.js';
import type { PresetConfigPort } from '../ports/preset-config-port.js';
import { TemplateConfig } from '../value-objects/template-config.js';
import type { TemplateType } from '../types/template-type.js';
import type { TriggerCondition } from '../types/trigger-condition.js';
import type { Result } from '../result.js';
import { ok, fail } from '../result.js';

const TRIGGER_CONDITION_MAP: Record<TemplateType, TriggerCondition> = {
  'aidlc-gate': 'pull_request',
  'consistency-check': 'schedule',
  'pre-commit': 'pre-commit',
};

export class TemplateGenerator {
  constructor(
    private readonly validatorIdRegistryPort: ValidatorIdRegistryPort,
    private readonly presetConfigPort: PresetConfigPort,
  ) {}

  async generateConfig(
    presetId: string,
    templateType: TemplateType,
  ): Promise<Result<TemplateConfig, Array<{ code: string; message: string }>>> {
    try {
      const [validatorIds, presetConfig] = await Promise.all([
        this.validatorIdRegistryPort.listAll(),
        this.presetConfigPort.getPreset(presetId),
      ]);

      if (validatorIds.length === 0) {
        return fail([{
          code: 'CI_TEMPLATE_EMPTY_VALIDATORS',
          message: 'INV-2: ValidatorIdRegistryPort returned empty list. targetValidatorIds cannot be empty.',
        }]);
      }

      const triggerCondition = TRIGGER_CONDITION_MAP[templateType];
      if (!triggerCondition) {
        return fail([{
          code: 'CI_TEMPLATE_INVALID_TYPE',
          message: `INV-1: Unknown templateType: ${templateType}`,
        }]);
      }

      const config = TemplateConfig.create({
        targetValidatorIds: validatorIds,
        triggerCondition,
        failOnWarning: presetConfig.failOnWarning,
      });

      return ok(config);
    } catch (err) {
      return fail([{
        code: 'CI_TEMPLATE_GENERATION_FAILED',
        message: `TemplateGenerator failed: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    }
  }
}
