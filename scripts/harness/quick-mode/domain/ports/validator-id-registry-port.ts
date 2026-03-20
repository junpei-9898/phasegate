/**
 * @layer domain
 * @unit quick-mode
 *
 * ValidatorId一覧取得のドメインポート
 */

export interface ValidatorIdRegistryPort {
  getAllValidatorIds(): Promise<readonly string[]>;
}
