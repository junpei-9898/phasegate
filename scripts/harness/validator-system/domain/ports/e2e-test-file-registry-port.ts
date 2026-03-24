/**
 * @layer domain
 * @unit validator-system
 *
 * E2eTestFileRegistryPort — E2Eテストファイル一覧取得ポート
 */

export interface E2eTestFileRegistryPort {
  /**
   * E2Eテストファイルのパス一覧を返す。
   */
  getE2eTestFiles(): Promise<readonly string[]>;
}

// @story-id H08-07