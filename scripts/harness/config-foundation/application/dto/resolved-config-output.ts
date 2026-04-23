/**
 * @layer application
 * @unit config-foundation
 */
import type { HarnessConfigV2 } from '../../domain/harness-config.js';

export interface ResolvedConfigOutput {
  readonly config: HarnessConfigV2;
  readonly sourcePath: string;
  readonly schemaVersion: 'v2' | 'v3';
}
