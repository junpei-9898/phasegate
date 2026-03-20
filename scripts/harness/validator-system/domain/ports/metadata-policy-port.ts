/**
 * @layer domain
 * @unit validator-system
 *
 * MetadataPolicyPort — traceability-model メタデータ検証仕様
 */
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
