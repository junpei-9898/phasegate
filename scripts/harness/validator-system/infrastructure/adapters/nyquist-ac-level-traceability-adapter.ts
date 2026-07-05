/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-222
 *
 * HF2-05 / L4-007: nyquist-validation の generate-matrix usecase を実行し、
 * AC 単位トレーサビリティの snapshot（acLevelCoverage / fileFallbackOnlyAcs / orphanAcTags）を
 * 収集して AcLevelTraceabilityPort として提供する adapter。
 *
 * advisory 用途のため、収集に失敗しても throw せず「所見なし」snapshot を返す（fail-open）。
 * これは L3-004（fail-closed な AC 網羅ゲート）とは独立した advisory tier であり、
 * 収集失敗が CI を落とすことは意図しない（ADR-019 §5: advisory は non-blocking）。
 */
import type { AcLevelTraceabilityPort } from '../../domain/ports/ac-level-traceability-port.js';
import type {
  AcLevelTraceabilitySnapshot,
  FileFallbackOnlyAc,
  OrphanAcTag,
} from '../../domain/services/l4/ac-level-traceability-service.js';

const EMPTY_SNAPSHOT: AcLevelTraceabilitySnapshot = Object.freeze({
  acLevelCoverage: { total: 0, acBound: 0, fileFallbackOnly: 0 },
  fileFallbackOnlyAcs: Object.freeze([]),
  orphanAcTags: Object.freeze([]),
});

export interface NyquistAcLevelTraceabilityAdapterOptions {
  readonly requirementsPath?: string;
  readonly testRoot?: string;
  readonly matrixFilePath?: string;
}

export class NyquistAcLevelTraceabilityAdapter implements AcLevelTraceabilityPort {
  private readonly requirementsPath: string;
  private readonly testRoot: string;
  private readonly matrixFilePath: string;

  constructor(options: NyquistAcLevelTraceabilityAdapterOptions = {}) {
    this.requirementsPath = options.requirementsPath ?? 'docs/product/user_stories.md';
    this.testRoot = options.testRoot ?? 'scripts/harness/__tests__';
    this.matrixFilePath = options.matrixFilePath ?? '.harness/requirement-test-matrix.json';
  }

  async collect(): Promise<AcLevelTraceabilitySnapshot> {
    try {
      const storyIds = await this.loadValidStoryIds();
      const { createNyquistValidationModule } = await import('../../../nyquist-validation/composition-root.js');
      const mod = createNyquistValidationModule({ getStoryIds: async () => storyIds });
      const output = await mod.generateMatrixUseCase.execute({
        requirementsPath: this.requirementsPath,
        testRoot: this.testRoot,
        matrixFilePath: this.matrixFilePath,
        write: false,
      });

      const fileFallbackOnlyAcs: FileFallbackOnlyAc[] = [];
      for (const story of output.matrix.stories) {
        for (const mapping of story.storyMappings) {
          if (mapping.testReferences.length === 0) continue;
          const hasAcBound = mapping.testReferences.some((ref) => ref.binding === 'ac');
          if (!hasAcBound) {
            fileFallbackOnlyAcs.push({ storyId: story.storyId, acId: mapping.acId });
          }
        }
      }

      const orphanAcTags: OrphanAcTag[] = output.report.orphanAcTags.map((tag) => ({
        storyId: tag.storyId,
        filePath: tag.filePath,
        testName: tag.testName,
        rawTag: tag.rawTag,
        reason: tag.reason,
      }));

      return {
        acLevelCoverage: {
          total: output.report.acLevelCoverage.total,
          acBound: output.report.acLevelCoverage.acBound,
          fileFallbackOnly: output.report.acLevelCoverage.fileFallbackOnly,
        },
        fileFallbackOnlyAcs: Object.freeze(fileFallbackOnlyAcs),
        orphanAcTags: Object.freeze(orphanAcTags),
      };
    } catch {
      return EMPTY_SNAPSHOT;
    }
  }

  private async loadValidStoryIds(): Promise<readonly string[]> {
    try {
      const { createConfigFoundationModule } = await import('../../../config-foundation/composition-root.js');
      const configModule = createConfigFoundationModule();
      const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute();
      const { createTraceabilityModelModule } = await import('../../../traceability-model/composition-root.js');
      const traceModule = createTraceabilityModelModule(process.cwd(), {
        pathRoots: { designDocsRoot: resolvedConfig.config.paths.designDocs },
      });
      const storyIds = await traceModule.storyCatalog.getAllStoryIds();
      return storyIds.map((s) => s.value);
    } catch {
      return [];
    }
  }
}
