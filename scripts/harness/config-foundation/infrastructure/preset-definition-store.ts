/**
 * @layer infrastructure
 * @unit config-foundation
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PresetId } from '../domain/harness-config.js';
import type { PresetDefinition } from '../domain/services/preset-resolution-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_DIRECTORY = path.resolve(__dirname, './presets');

function readPresetDefinition(presetId: PresetId): PresetDefinition {
  const presetPath = path.join(PRESETS_DIRECTORY, `${presetId}.json`);
  const raw = fs.readFileSync(presetPath, 'utf8');
  return JSON.parse(raw) as PresetDefinition;
}

export class PresetDefinitionStore {
  load(): Readonly<Record<PresetId, PresetDefinition>> {
    return {
      minimal: readPresetDefinition('minimal'),
      standard: readPresetDefinition('standard'),
      strict: readPresetDefinition('strict'),
    };
  }
}
