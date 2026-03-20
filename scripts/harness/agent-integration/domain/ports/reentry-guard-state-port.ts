/**
 * @layer domain
 * @unit agent-integration
 */

export interface ReentryGuardStatePort {
  readActive(): Promise<boolean>;
  writeActive(): Promise<void>;
  clearActive(): Promise<void>;
}
