/**
 * @layer application
 * @unit phase2-extensions
 */
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';

export interface PointerValidationResultDto {
  documentPath: string;
  pointerTarget: string;
  pointerType: 'file-path' | 'url';
  isResolvable: boolean;
  errorMessage: string | null;
}

export interface ValidateDocPointersOutput {
  results: PointerValidationResultDto[];
  summary: {
    totalDocuments: number;
    totalPointers: number;
    brokenPointers: number;
    skippedUrlPointers: number;
  };
  passed: boolean;
  errors: HarnessErrorContract[];
}
