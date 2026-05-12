/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-111
 *
 * CliE2eTestCoverageReport 値オブジェクト
 * CLIコマンド一覧とE2Eテストカバレッジ状況を表す不変値オブジェクト
 */

export interface CliCommandCoverageEntry {
  readonly commandName: string;
  readonly hasE2eTest: boolean;
  readonly status?: 'covered' | 'missing' | 'limitation';
  readonly evidence?: string;
}

export class CliE2eTestCoverageReport {
  readonly entries: readonly CliCommandCoverageEntry[];

  private constructor(entries: readonly CliCommandCoverageEntry[]) {
    this.entries = Object.freeze([...entries]);
    Object.freeze(this);
  }

  static create(entries: readonly CliCommandCoverageEntry[]): CliE2eTestCoverageReport {
    return new CliE2eTestCoverageReport(entries);
  }

  static empty(): CliE2eTestCoverageReport {
    return new CliE2eTestCoverageReport([]);
  }

  uncoveredCommands(): readonly CliCommandCoverageEntry[] {
    return this.entries.filter((e) => !e.hasE2eTest && e.status !== 'limitation');
  }

  limitations(): readonly CliCommandCoverageEntry[] {
    return this.entries.filter((e) => e.status === 'limitation');
  }

  hasViolations(): boolean {
    return this.uncoveredCommands().length > 0;
  }

  toMessages(): readonly string[] {
    return this.uncoveredCommands().map(
      (e) => `CLI command "${e.commandName}" has no corresponding E2E test`
    );
  }
}

// @story-id H08-07
