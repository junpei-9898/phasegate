// @unit attestation
// @layer infrastructure
// @work-item-id WI-286

import { createHash } from "node:crypto";
import type { Sha256Capability, Sha256DigestString } from "../../application/ports/sha256-capability.js";

/**
 * Attestation public SHA-256 capabilityのNode.js実装。
 *
 * 既存NodeCryptoContentHasherAdapterからprimitiveを移動し、
 * World向けにnode:crypto call siteを増やさない。
 */
export class NodeCryptoSha256Capability implements Sha256Capability {
  hashBytes(bytes: Uint8Array): Sha256DigestString {
    const hex = createHash("sha256").update(bytes).digest("hex");
    return `sha256:${hex}`;
  }
}
