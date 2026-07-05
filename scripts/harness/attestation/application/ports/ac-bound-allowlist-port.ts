// @unit attestation
// @layer application

/**
 * AcBoundAllowlistPort（H16-03 / WI-227）
 *
 * acBoundScope 導出のスコープ（`layers.L3.acBoundStories`）を供給する application ポート。
 */
export interface AcBoundAllowlistPort {
  /** スコープ対象 story-id を返す（未設定は []）。 */
  getAcBoundStories(): Promise<readonly string[]>;
}
