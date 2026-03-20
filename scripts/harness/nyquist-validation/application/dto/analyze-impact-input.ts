/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-04: AnalyzeImpactUseCase 入力DTO
 */

export interface AnalyzeImpactInput {
  readonly matrixFilePath: string;
  readonly storyId: string;
}
