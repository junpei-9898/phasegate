/**
 * @layer domain
 * @unit validator-system
 *
 * ItTestMockViolationReport 値オブジェクト
 * ITテストファイル内での vi.mock による内部モジュールモック違反を表す不変値オブジェクト
 */

export interface ItTestMockViolationEntry {
  readonly filePath: string;
  readonly mockedModules: readonly string[];
}

export class ItTestMockViolationReport {
  readonly violations: readonly ItTestMockViolationEntry[];

  private constructor(violations: readonly ItTestMockViolationEntry[]) {
    this.violations = Object.freeze([...violations]);
    Object.freeze(this);
  }

  static create(violations: readonly ItTestMockViolationEntry[]): ItTestMockViolationReport {
    return new ItTestMockViolationReport(violations);
  }

  static empty(): ItTestMockViolationReport {
    return new ItTestMockViolationReport([]);
  }

  hasViolations(): boolean {
    return this.violations.length > 0;
  }

  toMessages(): readonly string[] {
    return this.violations.flatMap((v) =>
      v.mockedModules.map(
        (mod) => `IT test "${v.filePath}" mocks internal module "${mod}" — use real implementations in IT tests`
      )
    );
  }
}

// @story-id H08-07