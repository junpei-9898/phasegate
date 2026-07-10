// @unit ci-governance
// @layer domain

/**
 * ファイルの SHA-256 digest（64 桁小文字 hex）を返すポート。
 * 既存の sha1 用 FileHasherPort とは別ポート（アルゴリズムが異なるため混同回避）。
 */
export interface Sha256HasherPort {
  hashFile(relativePath: string): Promise<string>;
}
