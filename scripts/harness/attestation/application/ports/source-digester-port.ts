// @unit attestation
// @layer application

import type { Digest } from "../../domain/value-objects/digest.js";

/**
 * source パスの「現在の」内容から sha256 Digest を供給する調停ポート（application 所有）。
 * 生成時は inputs.sources の digest 構築に、検証時は現在ファイルとの再照合に用いる。
 * git commit SHA 等の非ファイル source は本ポート実装または usecase 側で source エントリ化する。
 * 集約不変条件に関与しないファイル I/O 調停のため application に配置する。
 */
export interface SourceDigesterPort {
  /** 相対/絶対パスを解決して現在の内容を読み、sha256 Digest を返す。 */
  digestFile(path: string): Promise<Digest>;
}
