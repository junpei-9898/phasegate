/**
 * @layer domain
 * @unit agent-integration
 */

export type HookType = 'pre-tool-use' | 'post-tool-use' | 'stop';

export interface ConfigQueryPort {
  isHookEnabled(hookType: HookType): Promise<boolean>;
  getProtectedFilePatterns(): Promise<string[]>;
}
