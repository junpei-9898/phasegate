// @unit config-foundation
// @layer application
// @work-item-id WI-300

import type { HarnessConfigV2 } from "../../domain/harness-config.js";
import {
  WORLD_CONFIG_DEFAULTS,
  WorldConfig,
  type WorldConfigDocument,
} from "../../domain/value-objects/world-config.js";

export function toWorldModelConfig(resolvedConfig: HarnessConfigV2 | undefined): WorldConfigDocument | undefined {
  if (!resolvedConfig) return undefined;
  return WorldConfig.create(resolvedConfig.world ?? WORLD_CONFIG_DEFAULTS).toDocument();
}
