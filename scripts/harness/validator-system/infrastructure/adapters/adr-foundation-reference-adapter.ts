/**
 * @layer infrastructure
 * @unit validator-system
 *
 * AdrFoundationReferenceAdapter — AdrReferencePort実装
 */
import type { AdrReferencePort, AdrMetadata } from '../../domain/ports/adr-reference-port.js';

export class AdrFoundationReferenceAdapter implements AdrReferencePort {
  async exists(adrRef: string): Promise<boolean> {
    // stub実装: 実際の実装ではadr-foundationの公開インターフェースを使用する
    return false;
  }

  async getMetadata(adrRef: string): Promise<AdrMetadata | null> {
    return null;
  }
}
