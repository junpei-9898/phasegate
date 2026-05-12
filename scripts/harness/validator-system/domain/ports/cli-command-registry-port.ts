/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-111
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
