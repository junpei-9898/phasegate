// @unit validator-system
// @layer domain
// @work-item-id WI-111

import { CliE2eTestCoverageReport, type CliCommandCoverageEntry } from '../value-objects/cli-e2e-test-coverage-report.js';

export class CliE2eTestExistenceService {
  check(commands: readonly string[], e2eTestFiles: readonly string[]): CliE2eTestCoverageReport {
    if (e2eTestFiles.length === 0) {
      return CliE2eTestCoverageReport.create(
        commands.map((commandName) => ({
          commandName,
          hasE2eTest: false,
          status: 'limitation',
          evidence: 'No CLI E2E test suite found in this project.',
        })),
      );
    }

    const e2eContent = e2eTestFiles.join('\n').toLowerCase();

    const entries: CliCommandCoverageEntry[] = commands.map((commandName) => {
      const evidence = this.findCoverageEvidence(commandName, e2eContent);
      return {
        commandName,
        hasE2eTest: evidence !== null,
        status: evidence === null ? 'missing' : 'covered',
        evidence: evidence ?? undefined,
      };
    });

    return CliE2eTestCoverageReport.create(entries);
  }

  private findCoverageEvidence(commandName: string, e2eContent: string): string | null {
    const escaped = commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const invocationPatterns = [
      new RegExp(`\\brun\\(\\s*['"\`]${escaped}['"\`]`),
      new RegExp(`\\brunin(?:cwd)?\\([^\\n]*['"\`]${escaped}['"\`]`),
      new RegExp(`unknown command:\\s*${escaped}`),
      new RegExp(`usage:\\s*phasegate\\s+${escaped}`),
    ];
    if (invocationPatterns.some((pattern) => pattern.test(e2eContent))) {
      return commandName;
    }

    return e2eContent.includes(commandName.toLowerCase()) ? commandName : null;
  }
}

// @story-id H08-07
