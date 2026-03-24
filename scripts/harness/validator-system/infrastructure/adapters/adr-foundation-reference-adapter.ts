/**
 * @layer infrastructure
 * @unit validator-system
 *
 * AdrFoundationReferenceAdapter — AdrReferencePort実装
 */
import type { AdrReferencePort, AdrMetadata } from '../../domain/ports/adr-reference-port.js';

export class AdrFoundationReferenceAdapter implements AdrReferencePort {
  async exists(adrRef: string): Promise<boolean> {
    try {
      const adr = await this.findAdr(adrRef);
      return adr !== null;
    } catch {
      return false;
    }
  }

  async getMetadata(adrRef: string): Promise<AdrMetadata | null> {
    try {
      const adr = await this.findAdr(adrRef);
      if (!adr) {
        return null;
      }

      const frontmatter = adr.getFrontmatter();
      return {
        adrId: adr.toAdrRef(),
        title: frontmatter.title,
        status: frontmatter.status.value,
      };
    } catch {
      return null;
    }
  }

  private async findAdr(adrRef: string): Promise<{
    readonly getFrontmatter: () => { readonly title: string; readonly status: { readonly value: AdrMetadata['status'] } };
    readonly toAdrRef: () => string;
  } | null> {
    const { createAdrFoundationModule } = await import('../../../adr-foundation/composition-root.js');
    const { AdrId } = await import('../../../adr-foundation/domain/value-objects/adr-id.js');
    const mod = createAdrFoundationModule(process.cwd());
    const repository = mod.adrRepository;

    if ('findById' in repository && typeof repository.findById === 'function') {
      return repository.findById(AdrId.create(adrRef));
    }

    if ('findAll' in repository && typeof repository.findAll === 'function') {
      const adrs = await repository.findAll();
      return adrs.find((adr) => adr.toAdrRef() === adrRef) ?? null;
    }

    return null;
  }
}
