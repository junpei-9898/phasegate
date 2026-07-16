// @unit world-model
// @layer domain
// @work-item-id WI-287
import type { Sha256Digest } from "../value-objects/sha256-digest.js";

export interface WorldHashingPort {
  sha256(bytes: Uint8Array): Sha256Digest;
}
