/**
 * @layer application
 * @unit quick-mode
 *
 * Application層のValidatorIdRegistryPort
 * UT-BUC テストでの getAllIds メソッド名に対応するため独自定義
 */

export interface ValidatorIdRegistryPort {
  getAllIds(): readonly string[] | Promise<readonly string[]>;
}
