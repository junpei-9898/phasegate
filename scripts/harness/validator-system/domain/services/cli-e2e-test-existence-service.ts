// @unit validator-system
// @layer domain

import { CliE2eTestCoverageReport, type CliCommandCoverageEntry } from '../value-objects/cli-e2e-test-coverage-report.js';

export class CliE2eTestExistenceService {
  check(commands: readonly string[], e2eTestFiles: readonly string[]): CliE2eTestCoverageReport {
    const e2eContent = e2eTestFiles.join('\n').toLowerCase();

    const entries: CliCommandCoverageEntry[] = commands.map((commandName) => ({
      commandName,
      hasE2eTest: e2eContent.includes(commandName.toLowerCase()),
    }));

    return CliE2eTestCoverageReport.create(entries);
  }
}

// @story-id H08-07