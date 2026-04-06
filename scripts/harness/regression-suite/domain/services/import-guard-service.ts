// @layer domain
import type { AgentIndependenceTest } from '../value-objects/agent-independence-test.js';
import { ImportViolation } from '../value-objects/import-violation.js';
import type { ImportAnalyzerPort } from '../ports/import-analyzer-port.js';

export class ImportGuardService {
  constructor(private readonly importAnalyzerPort: ImportAnalyzerPort) {}

  async verify(test: AgentIndependenceTest): Promise<ImportViolation[]> {
    const foundImports = await this.importAnalyzerPort.analyzeImports(test.targetModule);

    // Check if target module is in allowed paths
    const isAllowed = test.allowedPaths.some((allowedPath) =>
      test.targetModule.includes(allowedPath)
    );

    if (isAllowed) {
      return [];
    }

    const violations: ImportViolation[] = [];
    for (const foundImport of foundImports) {
      for (const forbiddenPattern of test.forbiddenPatterns) {
        if (foundImport.includes(forbiddenPattern)) {
          violations.push(
            ImportViolation.create({
              modulePath: test.targetModule,
              forbiddenPackage: forbiddenPattern,
              violationMessage: `Forbidden import detected: ${forbiddenPattern} in ${test.targetModule}`,
            })
          );
          break;
        }
      }
    }

    return violations;
  }
}
