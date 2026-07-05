// @unit ci-governance
// @layer infrastructure
// @work-item-id WI-124 / WI-128
// @work-item-id WI-222

import type { ValidatorIdRegistryPort } from '../../domain/ports/validator-id-registry-port.js';
import { buildDefaultRegistry } from '../../../validator-system/composition-root.js';
import type { ValidatorDefinition } from '../../../validator-system/domain/value-objects/validator-definition.js';

type PresetId = 'minimal' | 'standard' | 'strict';

// WI-222 / HF2-05: default-OFF な advisory-only バリデータ。scheduled audit metadata や
// preset 導出リストには含めない（default-OFF の不変条件を保つ）。runtime では
// DEFAULT_CONFIG.layers.L4.validators に含まれないことで skip される。
const ADVISORY_DEFAULT_OFF_IDS = new Set<string>(['L4-007']);

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
  // WI-222 / HF2-05: default-OFF advisory バリデータは全 preset で除外する。
  if (ADVISORY_DEFAULT_OFF_IDS.has(definition.validatorId.value)) return false;
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
