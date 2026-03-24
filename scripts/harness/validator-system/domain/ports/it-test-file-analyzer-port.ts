/**
 * @layer domain
 * @unit validator-system
 *
 * ItTestFileAnalyzerPort — ITテストファイルのvi.mock解析ポート
 */

export interface ItTestMockCall {
  readonly filePath: string;
  readonly mockedModule: string;
}

export interface ItTestFileAnalyzerPort {
  /**
   * 指定ファイル群のITテストファイルをスキャンし、vi.mockで内部モジュールを
   * モックしている箇所を返す。
   */
  findMockCallsInItTests(targetPaths?: readonly string[]): Promise<readonly ItTestMockCall[]>;
}

// @story-id H08-07