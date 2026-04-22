// @unit validator-system
// @layer domain

import type { HarnessErrorLike } from '../value-objects/validation-result.js';

export interface MetadataPolicyPort {
  validateMetadata(context: {
    filePath: string;
    fileContent: string;
  }): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
  }>;
}
