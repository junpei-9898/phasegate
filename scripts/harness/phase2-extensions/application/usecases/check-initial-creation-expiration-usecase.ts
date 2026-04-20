/**
 * @layer application
 * @unit phase2-extensions
 */
import type { CheckInitialCreationExpirationInput } from '../dto/check-initial-creation-expiration-input.js';
import type { CheckInitialCreationExpirationOutput } from '../dto/check-initial-creation-expiration-output.js';
import type { InitialCreationExpirationConfigPort } from '../../domain/ports/initial-creation-expiration-config-port.js';
import type { DocumentScannerPort } from '../../domain/ports/document-scanner-port.js';
import type { FrontmatterReaderPort } from '../../domain/ports/frontmatter-reader-port.js';
import type { InitialCreationAgePort } from '../../domain/ports/initial-creation-age-port.js';
import type { InitialCreationExpirationCheckService } from '../../domain/services/initial-creation-expiration-check-service.js';
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';
import type { InitialCreationExpirationResult } from '../../domain/services/initial-creation-expiration-check-service.js';

export class CheckInitialCreationExpirationUseCase {
  constructor(
    private readonly configPort: InitialCreationExpirationConfigPort,
    private readonly scannerPort: DocumentScannerPort,
    private readonly frontmatterReaderPort: FrontmatterReaderPort,
    private readonly agePort: InitialCreationAgePort,
    private readonly checkService: InitialCreationExpirationCheckService,
  ) {}

  async execute(input: CheckInitialCreationExpirationInput): Promise<CheckInitialCreationExpirationOutput> {
    try {
      const allRules = await this.configPort.loadRules();
      const filteredRules = input.targetPattern
        ? allRules.filter((rule) => rule.documentPattern === input.targetPattern)
        : allRules;

      const results: InitialCreationExpirationResult[] = [];
      const warnings: HarnessErrorContract[] = [];

      for (const rule of filteredRules) {
        if (!rule.isEnabled()) {
          continue;
        }

        const documentPaths = await this.scannerPort.scan(rule.documentPattern);

        for (const documentPath of documentPaths) {
          const fmResult = await this.frontmatterReaderPort.read(documentPath);

          if (fmResult.parseError !== null) {
            warnings.push({
              code: 'L4-232',
              severity: 'warning',
              message: `frontmatter parse failed for ${documentPath}: ${fmResult.parseError}`,
              suggestion: 'YAML 構文を確認してください',
            });
            continue;
          }

          if (fmResult.flags === null || fmResult.flags.initialCreation !== true) {
            continue;
          }

          const age = await this.agePort.getAge(documentPath);
          const checkResult = this.checkService.check(rule, age, documentPath);
          results.push(checkResult);

          if (checkResult.level === 'warn') {
            warnings.push({
              code: 'L4-231',
              severity: 'warning',
              message: checkResult.message,
              suggestion: 'frontmatter を削除し @story-id 注釈を付与してください',
            });
          }
        }
      }

      const summary = {
        total: results.length,
        ok: results.filter((result) => result.level === 'ok').length,
        warn: results.filter((result) => result.level === 'warn').length,
      };

      return {
        results,
        summary,
        warnings,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';

      return {
        results: [],
        summary: { total: 0, ok: 0, warn: 0 },
        warnings: [],
        errors: [
          {
            code: 'L4-299',
            severity: 'error',
            message,
            suggestion: 'phasegate.config.json を確認してください',
          },
        ],
      };
    }
  }
}
