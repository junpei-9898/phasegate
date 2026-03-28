/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

export interface PhaseGateCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/**
 * FUSE PreWrite で使用する同期フェーズゲートチェックポート。
 * 書き込み対象ファイルパスに対して、前提設計文書の存在を検証する。
 */
export interface PhaseGateCheckPort {
  isWriteAllowed(relativeFilePath: string): PhaseGateCheckResult;
}
