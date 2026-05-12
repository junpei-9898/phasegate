/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-118
 *
 * ConsistencyCheckService ドメインサービス
 * 設計文書間のレイヤー整合性検証（L4-002）
 */
import { ConsistencyReport } from '../../value-objects/consistency-report.js';

export interface ConsistencyDesignDocumentPort {
  getLayerAnnotations(targetDocs?: readonly string[]): Promise<Record<string, string>>;
}

export interface ConsistencyAdrReferencePort {
  exists(adrRef: string): Promise<boolean>;
}

export interface ConsistencyCheckServiceDeps {
  designDocumentPort: ConsistencyDesignDocumentPort;
  adrReferencePort: ConsistencyAdrReferencePort;
}

export class ConsistencyCheckService {
  private readonly designDocumentPort: ConsistencyDesignDocumentPort;
  private readonly adrReferencePort: ConsistencyAdrReferencePort;

  constructor(deps: ConsistencyCheckServiceDeps) {
    this.designDocumentPort = deps.designDocumentPort;
    this.adrReferencePort = deps.adrReferencePort;
  }

  async check(targetDocs?: readonly string[]): Promise<ConsistencyReport> {
    const layerAnnotations = await this.designDocumentPort.getLayerAnnotations(targetDocs);

    const mismatchPairs: { expected: string; actual: string; location: string }[] = [];
    const checkTargets = Object.keys(layerAnnotations);

    for (const [location, annotation] of Object.entries(layerAnnotations)) {
      if (annotation === 'layer:unknown') {
        mismatchPairs.push({
          expected: 'known layer vocabulary',
          actual: 'unknown layer vocabulary',
          location,
        });
      }

      if (annotation.startsWith('unit:mismatch:')) {
        mismatchPairs.push({
          expected: annotation.slice('unit:mismatch:'.length),
          actual: location.includes('#unit:') ? location.slice(location.indexOf('#unit:') + '#unit:'.length) : 'unknown',
          location,
        });
      }
    }

    const knownAdrRefs = checkTargets
      .filter((t) => t.startsWith('ADR-'))
      .map((t) => t);

    for (const adrRef of knownAdrRefs) {
      const exists = await this.adrReferencePort.exists(adrRef);
      if (!exists) {
        mismatchPairs.push({
          expected: 'ADR exists',
          actual: 'ADR not found',
          location: adrRef,
        });
      }
    }

    return ConsistencyReport.create({
      mismatchPairs,
      checkTargets,
      checkedAt: new Date().toISOString(),
    });
  }
}
