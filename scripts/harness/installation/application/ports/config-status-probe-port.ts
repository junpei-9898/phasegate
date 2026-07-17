// @unit installation
// @layer application
// @work-item-id WI-330

import type { ConfigStatusProbeResult } from "../../domain/config-status.js";

export interface ConfigStatusProbePort {
  probe(projectRoot: string): Promise<ConfigStatusProbeResult>;
}
