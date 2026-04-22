// @unit validator-system
// @layer domain

import type { TextScanMatch } from '../ports/source-file-text-scanner-port.js';
import { StubCommentReport, type StubCommentEntry } from '../value-objects/stub-comment-report.js';

export class StubCommentDetectionService {
  static readonly STUB_COMMENT_PATTERN = /\/\/\s*(stub実装|Stub implementation|stub implementation|TODO.*stub|STUB)/i;

  detect(matches: readonly TextScanMatch[]): StubCommentReport {
    const entries: StubCommentEntry[] = matches.map((m) => ({
      filePath: m.filePath,
      lineNumber: m.lineNumber,
      lineContent: m.lineContent,
    }));
    return StubCommentReport.create(entries);
  }
}

// @story-id H08-07