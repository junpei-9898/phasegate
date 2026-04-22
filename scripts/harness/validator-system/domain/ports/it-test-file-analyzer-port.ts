// @unit validator-system
// @layer domain

export interface ItTestMockCall {
  readonly filePath: string;
  readonly mockedModule: string;
}

export interface ItTestFileAnalyzerPort {
  findMockCallsInItTests(targetPaths?: readonly string[]): Promise<readonly ItTestMockCall[]>;
}

// @story-id H08-07