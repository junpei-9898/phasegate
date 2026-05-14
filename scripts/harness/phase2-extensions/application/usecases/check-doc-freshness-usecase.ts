/**
 * @layer application
 * @unit phase2-extensions
 * @work-item-id WI-185
 */
import type { CheckDocFreshnessInput } from '../dto/check-doc-freshness-input.js';
import type { CheckDocFreshnessOutput } from '../dto/check-doc-freshness-output.js';
import type { FreshnessConfigPort } from '../../domain/ports/freshness-config-port.js';
import type { DocumentScannerPort } from '../../domain/ports/document-scanner-port.js';
import type { DocumentAgePort } from '../../domain/ports/document-age-port.js';
import type { FreshnessCheckService } from '../../domain/services/freshness-check-service.js';

function toHarnessError(message: string) {
  return {
    code: 'L4-299',
    severity: 'error' as const,
    message,
    suggestion: '設定または入力を確認してください',
  };
}

export class CheckDocFreshnessUseCase {
  constructor(
    private readonly freshnessConfigPort: FreshnessConfigPort,
    private readonly documentScannerPort: DocumentScannerPort,
    private readonly documentAgePort: DocumentAgePort,
    private readonly freshnessCheckService: FreshnessCheckService,
  ) {}

  async execute(input: CheckDocFreshnessInput): Promise<CheckDocFreshnessOutput> {
    try {
      const rules = await this.freshnessConfigPort.loadRules();

      const results = [];

      for (const rule of rules) {
        if (!rule.isEnabled()) {
          continue;
        }

        const scanPattern = input.targetPattern ?? rule.documentPattern;
        const documentPaths = await this.documentScannerPort.scan(scanPattern);
        for (const documentPath of documentPaths) {
          const age = await this.documentAgePort.getAge(documentPath);
          results.push(this.freshnessCheckService.check(rule, age, documentPath));
        }
      }

      return {
        results,
        summary: {
          total: results.length,
          ok: results.filter((result) => result.level === 'ok').length,
          warn: results.filter((result) => result.level === 'warn').length,
          error: results.filter((result) => result.level === 'error').length,
        },
        errors: [],
      };
    } catch (error) {
      return {
        results: [],
        summary: { total: 0, ok: 0, warn: 0, error: 0 },
        errors: [toHarnessError(error instanceof Error ? error.message : 'unknown error')],
      };
    }
  }
}
