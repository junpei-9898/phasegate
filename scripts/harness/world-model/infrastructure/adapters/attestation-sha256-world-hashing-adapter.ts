// @unit world-model
// @layer infrastructure
// @work-item-id WI-291

import type { Sha256Capability } from "../../../attestation/index.js";
import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../domain/value-objects/sha256-digest.js";

export class AttestationSha256WorldHashingAdapter implements WorldHashingPort {
  constructor(private readonly capability: Sha256Capability) {}

  sha256(bytes: Uint8Array): Sha256Digest {
    return Sha256Digest.create(this.capability.hashBytes(bytes));
  }
}
