/**
 * @layer domain
 * @unit ci-governance
 *
 * CiTemplate集約ルート
 */

import type { TemplateType } from '../types/template-type.js';
import { isTemplateType } from '../types/template-type.js';
import type { TemplateConfig } from '../value-objects/template-config.js';
import { CiGovernanceDomainError } from '../errors/ci-governance-domain-error.js';

export class CiTemplate {
  readonly templateType: TemplateType;
  readonly presetRef: string;
  readonly config: TemplateConfig | null;

  private constructor(
    templateType: TemplateType,
    presetRef: string,
    config: TemplateConfig | null,
  ) {
    this.templateType = templateType;
    this.presetRef = presetRef;
    this.config = config;
  }

  static create(templateType: TemplateType, presetRef: string): CiTemplate {
    if (!isTemplateType(templateType)) {
      throw new CiGovernanceDomainError(
        'CI_TEMPLATE_INVALID_TYPE',
        `INV-1: templateType must be one of 'aidlc-gate', 'consistency-check', 'pre-commit'. Got: ${templateType}`,
      );
    }
    if (!presetRef || presetRef.trim() === '') {
      throw new CiGovernanceDomainError('CI_TEMPLATE_INVALID_PRESET_REF', 'presetRef cannot be empty');
    }
    return new CiTemplate(templateType, presetRef, null);
  }

  withConfig(config: TemplateConfig): CiTemplate {
    if (!config.targetValidatorIds || config.targetValidatorIds.length === 0) {
      throw new CiGovernanceDomainError(
        'CI_TEMPLATE_EMPTY_VALIDATORS',
        'INV-2: targetValidatorIds must have at least one entry',
      );
    }
    return new CiTemplate(this.templateType, this.presetRef, config);
  }

  validate(): Array<{ code: string; message: string }> {
    const errors: Array<{ code: string; message: string }> = [];

    if (this.config === null) {
      errors.push({
        code: 'CI_TEMPLATE_NOT_CONFIGURED',
        message: 'CiTemplate is not configured. Call withConfig() first.',
      });
      return errors;
    }

    if (this.config.targetValidatorIds.length === 0) {
      errors.push({
        code: 'CI_TEMPLATE_EMPTY_VALIDATORS',
        message: 'INV-2: targetValidatorIds must have at least one entry',
      });
    }

    return errors;
  }

  isConfigured(): boolean {
    return this.config !== null;
  }
}
