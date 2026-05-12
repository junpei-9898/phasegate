/**
 * @layer application
 * @unit phase2-extensions
 * @work-item-id WI-122
 */
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';

export interface PointerValidationResultDto {
  documentPath: string;
  pointerTarget: string;
  pointerType: 'file-path' | 'url';
  semanticPointerType: 'reference' | 'implementation' | 'adr' | 'product-doc' | 'external-url';
  owner: string;
  severity: 'fail' | 'warn' | 'skip';
  isResolvable: boolean;
  errorMessage: string | null;
  nextAction: string;
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
