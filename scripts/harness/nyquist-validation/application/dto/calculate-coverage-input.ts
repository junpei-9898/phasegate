/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-03: CalculateCoverageUseCase 入力DTO
 */

export interface CalculateCoverageInput {
  readonly matrixFilePath: string;
  readonly checkThreshold?: boolean;
}
