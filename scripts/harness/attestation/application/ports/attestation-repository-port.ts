// @unit attestation
// @layer application

import type { AttestationDocument } from "../dto/attestation-document.js";

/**
 * attestation ファイルの read/write を抽象化する永続化調停ポート（application 所有）。
 * 集約不変条件に関与しないため domain ではなく application に配置する。
 */
export interface AttestationRepositoryPort {
  write(path: string, doc: AttestationDocument): Promise<void>;
  /** parse 済み plain object を返す。不在/parse 失敗は throw し usecase が exitCode 2 へ変換する。 */
  read(path: string): Promise<unknown>;
}
