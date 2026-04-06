// @layer domain
// artifact-scanner-port.ts

import type { ArtifactScanResult } from '../value-objects/artifact-scan-result.js';

export interface ArtifactScannerPort {
  scan(): Promise<ArtifactScanResult>;
}
