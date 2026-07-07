/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * AdrExistencePort実装
 */

import * as path from 'node:path';
import type { AdrExistencePort } from '../../domain/ports/adr-existence-port.js';

export class AdrFoundationExistenceAdapter implements AdrExistencePort {
  private repositoryPromise: Promise<{
    exists(id: { readonly value: string }): Promise<boolean>;
  }> | null = null;

  constructor(private readonly rootDir: string = process.cwd()) {}

  async exists(adrId: string): Promise<boolean> {
    try {
      const { AdrId } = await import('../../../adr-foundation/domain/value-objects/adr-id.js');
      const id = AdrId.create(adrId);
      const repository = await this.getRepository();
      return repository.exists(id);
    } catch {
      return false;
    }
  }

  private async getRepository(): Promise<{
    exists(id: { readonly value: string }): Promise<boolean>;
  }> {
    if (!this.repositoryPromise) {
      this.repositoryPromise = (async () => {
        const { createAdrFoundationModule } = await import('../../../adr-foundation/composition-root.js');
        return createAdrFoundationModule(path.join(this.rootDir, 'docs', 'ADR')).adrRepository;
      })();
    }
    return this.repositoryPromise;
  }
}
