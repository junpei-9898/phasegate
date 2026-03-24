/**
 * @layer domain
 * @unit validator-system
 *
 * StubCommentReport 値オブジェクト
 * ソースファイル内のスタブコメント残存を表す不変値オブジェクト
 */

export interface StubCommentEntry {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly lineContent: string;
}

export class StubCommentReport {
  readonly entries: readonly StubCommentEntry[];

  private constructor(entries: readonly StubCommentEntry[]) {
    this.entries = Object.freeze([...entries]);
    Object.freeze(this);
  }

  static create(entries: readonly StubCommentEntry[]): StubCommentReport {
    return new StubCommentReport(entries);
  }

  static empty(): StubCommentReport {
    return new StubCommentReport([]);
  }

  hasViolations(): boolean {
    return this.entries.length > 0;
  }

  toMessages(): readonly string[] {
    return this.entries.map(
      (e) => `Stub comment found at "${e.filePath}":${e.lineNumber} — "${e.lineContent.trim()}"`
    );
  }
}

// @story-id H08-07