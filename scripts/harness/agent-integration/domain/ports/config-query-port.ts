// @unit agent-integration
// @layer domain

import type { ProjectPaths } from '../value-objects/project-paths.js';

export type HookType = 'pre-tool-use' | 'post-tool-use' | 'stop';

export interface ConfigQueryPort {
  isHookEnabled(hookType: HookType): Promise<boolean>;
  getProtectedFilePatterns(): Promise<string[]>;
  getProtectedFileExclusions(): Promise<string[]>;
  getProjectPaths(): ProjectPaths;
}
