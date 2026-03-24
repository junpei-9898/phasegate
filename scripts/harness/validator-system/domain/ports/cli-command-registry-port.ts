/**
 * @layer domain
 * @unit validator-system
 *
 * CliCommandRegistryPort — 登録済みCLIコマンド一覧取得ポート
 */

export interface CliCommandRegistryPort {
  /**
   * 登録済みCLIコマンド名の一覧を返す。
   */
  getRegisteredCommands(): Promise<readonly string[]>;
}

// @story-id H08-07