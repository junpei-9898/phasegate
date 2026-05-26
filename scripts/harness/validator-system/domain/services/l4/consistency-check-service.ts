/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-118
 *
 * ConsistencyCheckService ドメインサービス
 * 設計文書間のレイヤー整合性検証（L4-002）
 */
import { ConsistencyReport } from '../../value-objects/consistency-report.js';
import type { MismatchPair } from '../../value-objects/consistency-report.js';

export interface ConsistencyDesignDocumentPort {
  getLayerAnnotations(targetDocs?: readonly string[]): Promise<Record<string, string>>;
}

export interface ConsistencyAdrReferencePort {
  exists(adrRef: string): Promise<boolean>;
}

export interface WorkItemReflectionSnapshot {
  readonly workItems: readonly {
    readonly id: string;
    readonly path: string;
    readonly type?: string;
  }[];
  readonly productRefs: readonly {
    readonly id: string;
    readonly path: string;
  }[];
  readonly skipReason?: string;
}

export interface WorkItemReflectionPort {
  collect(input: {
    readonly inceptionRoot: string;
    readonly designRoot: string;
  }): Promise<WorkItemReflectionSnapshot>;
}

export interface ConsistencyCheckServiceDeps {
  designDocumentPort: ConsistencyDesignDocumentPort;
  adrReferencePort: ConsistencyAdrReferencePort;
  workItemReflectionPort?: WorkItemReflectionPort;
}

export class ConsistencyCheckService {
  private readonly designDocumentPort: ConsistencyDesignDocumentPort;
  private readonly adrReferencePort: ConsistencyAdrReferencePort;
  private readonly workItemReflectionPort?: WorkItemReflectionPort;

  constructor(deps: ConsistencyCheckServiceDeps) {
    this.designDocumentPort = deps.designDocumentPort;
    this.adrReferencePort = deps.adrReferencePort;
    this.workItemReflectionPort = deps.workItemReflectionPort;
  }

  async check(targetDocs?: readonly string[]): Promise<ConsistencyReport> {
    const layerAnnotations = await this.designDocumentPort.getLayerAnnotations(targetDocs);

    const mismatchPairs: MismatchPair[] = [];
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

  async checkWorkItemReflection(input: {
    readonly inceptionRoot: string;
    readonly designRoot: string;
  }): Promise<{ readonly report: ConsistencyReport; readonly skipReason?: string }> {
    if (!this.workItemReflectionPort) {
      return {
        report: ConsistencyReport.create({ mismatchPairs: [], checkTargets: [], checkedAt: new Date().toISOString() }),
        skipReason: 'work item reflection scanner is not configured',
      };
    }

    const snapshot = await this.workItemReflectionPort.collect(input);
    const checkTargets = [
      ...snapshot.workItems.map((item) => `${item.path}#work-item:${item.id}`),
      ...snapshot.productRefs.map((ref) => `${ref.path}#work-item:${ref.id}`),
    ];
    const productRefIds = new Set(snapshot.productRefs.map((ref) => ref.id));
    const workItemIds = new Set(snapshot.workItems.map((item) => item.id));
    const reflectionRequiredItems = snapshot.workItems.filter((item) => item.type !== 'chore');
    const mismatchPairs: MismatchPair[] = [];

    for (const item of reflectionRequiredItems) {
      if (!productRefIds.has(item.id)) {
        mismatchPairs.push({
          expected: `product docs contain @work-item-id ${item.id}`,
          actual: 'missing product reflection',
          location: item.path,
          nextAction: `Add @work-item-id ${item.id} to the matching product construction document under ${input.designRoot}.`,
        });
      }
    }

    for (const ref of snapshot.productRefs) {
      if (!workItemIds.has(ref.id)) {
        mismatchPairs.push({
          expected: `inception description exists for ${ref.id}`,
          actual: 'orphan product reflection',
          location: ref.path,
          nextAction: `Create or restore an inception description for ${ref.id} under ${input.inceptionRoot}, or remove the stale product annotation.`,
        });
      }
    }

    return {
      report: ConsistencyReport.create({
        mismatchPairs,
        checkTargets,
        checkedAt: new Date().toISOString(),
      }),
      skipReason: snapshot.skipReason,
    };
  }
}
