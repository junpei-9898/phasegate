// @unit ci-governance
// @layer infrastructure
// @work-item-id WI-124

import type { ValidatorIdRegistryPort } from '../../domain/ports/validator-id-registry-port.js';
import { buildDefaultRegistry } from '../../../validator-system/composition-root.js';
import type { ValidatorDefinition } from '../../../validator-system/domain/value-objects/validator-definition.js';

type PresetId = 'minimal' | 'standard' | 'strict';

export class ValidatorIdRegistryAdapter implements ValidatorIdRegistryPort {
  constructor(private readonly registryUrl?: string) {}

  async listAll(): Promise<string[]> {
    void this.registryUrl;
    return buildDefaultRegistry().getAllDefinitions().map((definition) => definition.validatorId.value);
  }

  async listForPreset(presetId: string, templateType: string): Promise<string[]> {
    const preset = normalizePreset(presetId);
    const definitions = buildDefaultRegistry().getAllDefinitions();
    return definitions
      .filter((definition) => isIncludedForPreset(definition, preset, templateType))
      .map((definition) => definition.validatorId.value);
  }
}

function normalizePreset(presetId: string): PresetId {
  return presetId === 'minimal' || presetId === 'strict' ? presetId : 'standard';
}

function isIncludedForPreset(definition: ValidatorDefinition, preset: PresetId, templateType: string): boolean {
  if (preset === 'minimal') return false;
  if (definition.layer === 'L4') {
    if (templateType === 'consistency-check') return true;
    if (preset !== 'strict') return false;
  }
  if (definition.enabledCondition === 'strictOnly') {
    return preset === 'strict' || (definition.layer === 'L4' && templateType === 'consistency-check');
  }
  return true;
}
