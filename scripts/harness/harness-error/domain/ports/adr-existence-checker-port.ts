/**
 * @layer domain
 * @unit harness-error
 *
 * ADR実在確認ポート
 * Infrastructure層が実装し、docs/ADR/ 配下に参照ADRが存在するか確認する
 */
import type { AdrRef } from '../value-objects/adr-ref.js';

export interface AdrExistenceCheckerPort {
  exists(adrRef: AdrRef): Promise<boolean>;
}
