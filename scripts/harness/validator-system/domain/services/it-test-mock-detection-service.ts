/**
 * @layer domain
 * @unit validator-system
 *
 * ItTestMockDetectionService — H08-07: ITテスト内部モック検出ドメインサービス
 * ITテストファイルのvi.mock呼び出しで内部モジュールをモックしている箇所を検出する。
 */
import type { ItTestMockCall } from '../ports/it-test-file-analyzer-port.js';
import { ItTestMockViolationReport, type ItTestMockViolationEntry } from '../value-objects/it-test-mock-violation-report.js';

/** 外部モジュール（node:, npm パッケージ）のパターン — これらはモック許可 */
const EXTERNAL_MODULE_PATTERNS = [
  /^node:/,
  /^vitest$/,
  /^@vitest\//,
  /^[^./]/, // node_modules (starts without . or /)
];

function isExternalModule(modulePath: string): boolean {
  return EXTERNAL_MODULE_PATTERNS.some((pattern) => pattern.test(modulePath));
}

export class ItTestMockDetectionService {
  detect(mockCalls: readonly ItTestMockCall[]): ItTestMockViolationReport {
    const internalMocks = mockCalls.filter((call) => !isExternalModule(call.mockedModule));

    // Group by filePath
    const byFile = new Map<string, string[]>();
    for (const call of internalMocks) {
      const existing = byFile.get(call.filePath) ?? [];
      existing.push(call.mockedModule);
      byFile.set(call.filePath, existing);
    }

    const entries: ItTestMockViolationEntry[] = Array.from(byFile.entries()).map(([filePath, mockedModules]) => ({
      filePath,
      mockedModules: Object.freeze(mockedModules),
    }));

    return ItTestMockViolationReport.create(entries);
  }
}

// @story-id H08-07