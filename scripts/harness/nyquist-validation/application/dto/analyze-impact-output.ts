/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-04: AnalyzeImpactUseCase 出力DTO
 */

export interface TestReferenceDto {
  readonly filePath: string;
  readonly testType: 'unit' | 'it' | 'scenario';
}

export interface AnalyzeImpactOutput {
  readonly storyId: string;
  readonly directTests: readonly TestReferenceDto[];
  readonly directMappingOnly: true;
  readonly found: boolean;
}
