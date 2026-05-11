// @unit installation
// @layer infrastructure
// @work-item-id WI-145

import { createHash } from "node:crypto";
import { Hash } from "../../domain/hash.js";
import type { HashCalculatorPort } from "../../application/ports/hash-calculator-port.js";

export class NodeCryptoHashAdapter implements HashCalculatorPort {
  compute(content: string | Buffer): Hash {
    return Hash.from(`sha256:${createHash("sha256").update(content).digest("hex")}`);
  }
}
