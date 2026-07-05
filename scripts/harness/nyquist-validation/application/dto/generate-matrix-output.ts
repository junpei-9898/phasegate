// @layer application
// @unit nyquist-validation
// @work-item-id WI-125
// @work-item-id WI-131

// Intent coverage 系の型は domain 層（value-objects/intent-coverage）を正準とし、
// application 層はそれを参照・再エクスポートする（domain ← application の正しい依存方向）。
import type {
  IntentCoverageStatus as DomainIntentCoverageStatus,
  IntentCoverageItem as DomainIntentCoverageItem,
} from '../../domain/value-objects/intent-coverage.js';

export interface RequirementSourceDto {
  readonly storyId: string;
  readonly acIds: readonly string[];
}

/**
 * HF2-05: @ac が story 外の AC を指した／複数 @story のため相対 AC が解決できなかった等の
 * 「解決に失敗した @ac タグ」を advisory として記録する（error ではない）。
 */
export interface OrphanAcTagDto {
  readonly storyId: string;
  readonly filePath: string;
  readonly testName?: string;
  /** 解決できなかった生の @ac 表記（絶対 HXX-YY-N / 相対 AC-N のいずれか） */
  readonly rawTag: string;
  readonly reason: 'ac-not-in-story' | 'relative-multi-story';
}

export interface TestReferenceSourceDto {
  readonly storyId: string;
  readonly filePath: string;
  readonly testType: 'unit' | 'it' | 'scenario';
  readonly testName?: string;
  /**
   * HF2-05: このテストケースが個別に検証する AC の id 群（`AC-N` 形式）。
   * @ac 注釈が無いテストは undefined（従来どおり file-fallback で全 AC にファンアウトする）。
   */
  readonly acIds?: readonly string[];
  /** HF2-05: 解決に失敗した @ac タグ（advisory）。 */
  readonly orphanAcTags?: readonly OrphanAcTagDto[];
}

export interface MatrixTestReferenceDto {
  readonly filePath: string;
  readonly testType: 'unit' | 'it' | 'scenario';
  readonly testName?: string;
  /**
   * HF2-05: この参照が AC 単位で紐づいたか（`"ac"`）、
   * @ac 注釈が無く file-fallback で全 AC にファンアウトしたか（`"file"`）。
   * 1.0 マトリクス（binding 無し）は `"file"` と等価に扱う（dedup 正規化）。
   */
  readonly binding?: 'ac' | 'file';
}

export interface MatrixAcMappingDto {
  readonly acId: string;
  readonly testReferences: readonly MatrixTestReferenceDto[];
}

export interface MatrixStoryDto {
  readonly storyId: string;
  readonly storyMappings: readonly MatrixAcMappingDto[];
}

export interface RequirementTestMatrixDto {
  readonly version: string;
  readonly generatedAt: string;
  readonly stories: readonly MatrixStoryDto[];
}

export interface MissingTestDto {
  readonly storyId: string;
  readonly acId: string;
}

export interface OrphanTestDto {
  readonly storyId: string;
  readonly filePath: string;
  readonly testName?: string;
}

export type IntentCoverageStatus = DomainIntentCoverageStatus;

export type IntentCoverageItemDto = DomainIntentCoverageItem;

/**
 * HF2-05: AC 単位トレーサビリティの advisory 集計。
 * - total: マトリクス上の全 AC 数
 * - acBound: 少なくとも 1 件の binding="ac" 参照を持つ AC 数
 * - fileFallbackOnly: binding="ac" 参照を持たない（file-fallback のみで linked な）AC 数
 */
export interface AcLevelCoverageDto {
  readonly total: number;
  readonly acBound: number;
  readonly fileFallbackOnly: number;
}

export interface MatrixGenerationReportDto {
  readonly missingTests: readonly MissingTestDto[];
  readonly orphanTests: readonly OrphanTestDto[];
  readonly unknownStories: readonly string[];
  readonly preservedReferences: number;
  readonly intentCoverage: readonly IntentCoverageItemDto[];
  /** HF2-05: AC 単位カバレッジ集計（advisory）。 */
  readonly acLevelCoverage: AcLevelCoverageDto;
  /** HF2-05: 解決に失敗した @ac タグ（advisory）。 */
  readonly orphanAcTags: readonly OrphanAcTagDto[];
}

export interface GenerateMatrixOutput {
  readonly matrix: RequirementTestMatrixDto;
  readonly report: MatrixGenerationReportDto;
}
