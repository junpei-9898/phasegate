/**
 * @layer domain
 * @unit ci-governance
 *
 * TemplateConfig VO
 */

import type { TriggerCondition } from '../types/trigger-condition.js';
import { isTriggerCondition } from '../types/trigger-condition.js';

export interface TemplateConfigProps {
  readonly targetValidatorIds: string[];
  readonly triggerCondition: TriggerCondition;
  readonly failOnWarning: boolean;
}

export class TemplateConfig {
  readonly targetValidatorIds: readonly string[];
  readonly triggerCondition: TriggerCondition;
  readonly failOnWarning: boolean;

  private constructor(props: TemplateConfigProps) {
    this.targetValidatorIds = Object.freeze([...props.targetValidatorIds]);
    this.triggerCondition = props.triggerCondition;
    this.failOnWarning = props.failOnWarning;
  }

  static create(props: TemplateConfigProps): TemplateConfig {
    if (props.targetValidatorIds.length === 0) {
      throw new Error('INV-2: targetValidatorIds must have at least one entry');
    }
    if (!isTriggerCondition(props.triggerCondition)) {
      throw new Error(`Invalid triggerCondition: ${props.triggerCondition}`);
    }
    return new TemplateConfig(props);
  }

  equals(other: TemplateConfig): boolean {
    if (this.triggerCondition !== other.triggerCondition) return false;
    if (this.failOnWarning !== other.failOnWarning) return false;
    const sortedThis = [...this.targetValidatorIds].sort();
    const sortedOther = [...other.targetValidatorIds].sort();
    if (sortedThis.length !== sortedOther.length) return false;
    return sortedThis.every((id, i) => id === sortedOther[i]);
  }
}
