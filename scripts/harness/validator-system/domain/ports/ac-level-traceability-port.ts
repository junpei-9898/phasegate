/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-222
 *
 * HF2-05 / L4-007: nyquist-validation のマトリクス生成レポートを AC 単位トレーサビリティの
 * snapshot へ橋渡しする port。実装（infrastructure adapter）が nyquist の generate-matrix
 * usecase を実行し、acLevelCoverage / fileFallbackOnlyAcs / orphanAcTags を収集する。
 */
import type { AcLevelTraceabilitySnapshot } from '../services/l4/ac-level-traceability-service.js';

export interface AcLevelTraceabilityPort {
  collect(): Promise<AcLevelTraceabilitySnapshot>;
}
