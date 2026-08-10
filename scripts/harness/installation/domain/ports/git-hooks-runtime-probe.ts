// @unit installation
// @layer domain
// @work-item-id WI-390

import type { HuskyRuntimeState } from '../husky-runtime-state.js';

export interface GitHooksRuntimeProbe {
  probe(projectRoot: string): Promise<HuskyRuntimeState>;
}
