/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * AdrExistencePort実装
 */

import type { AdrExistencePort } from '../../domain/ports/adr-existence-port.js';

export class AdrFoundationExistenceAdapter implements AdrExistencePort {
  constructor(private readonly knownAdrIds: string[] = []) {}

  async exists(adrId: string): Promise<boolean> {
    return this.knownAdrIds.includes(adrId);
  }
}
