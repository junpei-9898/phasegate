/**
 * @layer application
 * @unit phase2-extensions
 * @work-item-id WI-122, WI-185
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

      const results = [];
      let totalDocuments = 0;
      let skippedUrlPointers = 0;

      for (const rule of rules) {
        const scanPattern = input.targetPattern ?? rule.documentPattern;
        const documentPaths = await this.documentScannerPort.scan(scanPattern);
        totalDocuments += documentPaths.length;

        for (const documentPath of documentPaths) {
          const pointers = await this.pointerExtractorPort.extract(documentPath);
          const validationResults = await this.pointerResolutionService.resolve(pointers);

          for (const validationResult of validationResults) {
            const semanticPointerType = classifyPointerTarget(validationResult.pointer.target, validationResult.pointer.type);
            const severity = validationResult.pointer.isUrl() && !input.includeUrlPointers
              ? 'skip'
              : rule.policyFor(semanticPointerType);

            if (severity === 'skip') {
              if (validationResult.pointer.isUrl()) skippedUrlPointers += 1;
              continue;
            }

            results.push({
              documentPath,
              pointerTarget: validationResult.pointer.target,
              pointerType: validationResult.pointer.type,
              semanticPointerType,
              owner: rule.owner,
              severity,
              isResolvable: validationResult.isResolvable,
              errorMessage: validationResult.errorMessage,
              nextAction: validationResult.isResolvable
                ? 'no action required'
                : `Fix ${semanticPointerType} pointer or change policy for owner ${rule.owner}`,
            });
          }

          const hasBrokenPointers = validationResults.some((entry) => !entry.isResolvable);
          if (hasBrokenPointers && !rule.shouldFailOnBroken()) {
            continue;
          }
        }
      }

      const brokenPointers = results.filter((result) => !result.isResolvable).length;
      const passed = !results.some((result) => !result.isResolvable && result.severity === 'fail');

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

function classifyPointerTarget(target: string, rawType: 'file-path' | 'url'): 'reference' | 'implementation' | 'adr' | 'product-doc' | 'external-url' {
  if (rawType === 'url') return 'external-url';
  if (/docs\/ADR\/|ADR-\d{3}/i.test(target)) return 'adr';
  if (/docs\/product\//.test(target)) return 'product-doc';
  if (/scripts\/harness\/|\.ts$/.test(target)) return 'implementation';
  return 'reference';
}
