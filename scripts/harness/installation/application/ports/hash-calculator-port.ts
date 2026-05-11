// @unit installation
// @layer application
// @work-item-id WI-145

import type { Hash } from "../../domain/hash.js";

export interface HashCalculatorPort {
  compute(content: string | Buffer): Hash;
}
