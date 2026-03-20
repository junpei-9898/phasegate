/**
 * @layer application
 * @unit agent-integration
 */

import type { FallbackCapabilitySpec } from '../../domain/value-objects/fallback-capability-spec.js';

export interface VerifyFallbackCapabilityInput {
  supportedCommands: string[];
  noAgentApiImports: boolean;
  targetFilePaths?: string[];
}

export interface VerifyFallbackCapabilityOutput {
  isValid: boolean;
  violations: readonly Error[];
  spec: FallbackCapabilitySpec;
}
