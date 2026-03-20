/**
 * @layer application
 * @unit phase2-extensions
 */
import type { FreshnessConfigPort } from '../../domain/ports/freshness-config-port.js';
import type { DocumentScannerPort } from '../../domain/ports/document-scanner-port.js';
import type { PointerExtractorPort } from '../../domain/ports/pointer-extractor-port.js';
import type { PointerResolutionService } from '../../domain/services/pointer-resolution-service.js';
import type { ValidateDocPointersInput } from '../dto/validate-doc-pointers-input.js';
import type { ValidateDocPointersOutput } from '../dto/validate-doc-pointers-output.js';

function toHarnessError(message: string) {
  return {
    code: 'L4-298',
    severity: 'error' as const,
    message,
    suggestion: '入力またはポインタ設定を確認してください',
  };
}

export class ValidateDocPointersUseCase {
  constructor(
    private readonly freshnessConfigPort: FreshnessConfigPort,
    private readonly documentScannerPort: DocumentScannerPort,
    private readonly pointerExtractorPort: PointerExtractorPort,
    private readonly pointerResolutionService: PointerResolutionService,
  ) {}

  async execute(input: ValidateDocPointersInput): Promise<ValidateDocPointersOutput> {
    try {
      const rules = await this.freshnessConfigPort.loadPointerRules();
      const filteredRules = input.targetPattern
        ? rules.filter((rule) => rule.documentPattern === input.targetPattern)
        : rules;

      const results = [];
      let totalDocuments = 0;

      for (const rule of filteredRules) {
        const documentPaths = await this.documentScannerPort.scan(rule.documentPattern);
        totalDocuments += documentPaths.length;

        for (const documentPath of documentPaths) {
          const pointers = await this.pointerExtractorPort.extract(documentPath);
          const validationResults = await this.pointerResolutionService.resolve(pointers);

          for (const validationResult of validationResults) {
            if (validationResult.pointer.isUrl() && !input.includeUrlPointers) {
              continue;
            }

            results.push({
              documentPath,
              pointerTarget: validationResult.pointer.target,
              pointerType: validationResult.pointer.type,
              isResolvable: validationResult.isResolvable,
              errorMessage: validationResult.errorMessage,
            });
          }

          const hasBrokenPointers = validationResults.some((entry) => !entry.isResolvable);
          if (hasBrokenPointers && !rule.shouldFailOnBroken()) {
            continue;
          }
        }
      }

      const brokenPointers = results.filter((result) => !result.isResolvable).length;
      const skippedUrlPointers = results.filter((result) => result.pointerType === 'url').length;
      const failingRules = filteredRules.filter((rule) => rule.shouldFailOnBroken());
      const passed = failingRules.length === 0 || brokenPointers === 0;

      return {
        results,
        summary: {
          totalDocuments,
          totalPointers: results.length,
          brokenPointers,
          skippedUrlPointers,
        },
        passed,
        errors: [],
      };
    } catch (error) {
      return {
        results: [],
        summary: {
          totalDocuments: 0,
          totalPointers: 0,
          brokenPointers: 0,
          skippedUrlPointers: 0,
        },
        passed: false,
        errors: [toHarnessError(error instanceof Error ? error.message : 'unknown error')],
      };
    }
  }
}
