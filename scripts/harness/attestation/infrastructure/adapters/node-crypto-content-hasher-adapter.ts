// @unit attestation
// @layer infrastructure

import { createHash } from "node:crypto";
import type { ContentHasherPort } from "../../domain/ports/content-hasher-port.js";
import { Digest } from "../../domain/value-objects/digest.js";

/**
 * ContentHasherPort の node:crypto 実装。
 * canonical payload / source content の sha256 を `sha256:<64hex>` Digest として返す。
 * installation の node-crypto-hash-adapter をミラーし、アルゴリズムは sha256 に固定する。
 */
export class NodeCryptoContentHasherAdapter implements ContentHasherPort {
  sha256(content: string): Digest {
    const hex = createHash("sha256").update(content, "utf8").digest("hex");
    return Digest.fromSha256Hex(hex);
  }
}
