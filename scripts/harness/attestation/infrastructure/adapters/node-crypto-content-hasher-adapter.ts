// @unit attestation
// @layer infrastructure

import { hashUtf8, type Sha256Capability } from "../../application/ports/sha256-capability.js";
import type { ContentHasherPort } from "../../domain/ports/content-hasher-port.js";
import { Digest } from "../../domain/value-objects/digest.js";
import { NodeCryptoSha256Capability } from "./node-crypto-sha256-capability.js";

/**
 * Public Sha256Capabilityをattestation-local ContentHasherPortへ変換するadapter。
 */
export class NodeCryptoContentHasherAdapter implements ContentHasherPort {
  constructor(private readonly capability: Sha256Capability = new NodeCryptoSha256Capability()) {}

  sha256(content: string): Digest {
    return Digest.create(hashUtf8(this.capability, content));
  }
}
