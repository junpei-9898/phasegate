/**
 * @layer domain
 * @unit validator-system
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

    // レイヤー記述の整合性チェック（全ドキュメントが同じレイヤーを参照していることを確認）
    const layerValues = Object.values(layerAnnotations);
    if (layerValues.length > 1) {
      const referenceLayer = layerValues[0];
      for (const [docPath, layer] of Object.entries(layerAnnotations)) {
        if (layer !== referenceLayer) {
          mismatchPairs.push({
            expected: referenceLayer,
            actual: layer,
            location: docPath,
          });
        }
      }
    }

    // ADR実在性確認（ポートが存在する場合）
    // adrReferencePort.exists を使って参照 ADR の実在を確認する
    // DesignDocumentPort の layerAnnotations には ADR 参照が含まれないため、
    // ADR 参照は別途取得する（ここではシンプル実装）
    // ADR not found => mismatch として扱う
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
