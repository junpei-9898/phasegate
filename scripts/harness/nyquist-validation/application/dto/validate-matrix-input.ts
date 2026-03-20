/**
 * @layer application
 * @unit nyquist-validation
 *
 * H07-01: ValidateMatrixUseCase 入力DTO
 */

export interface ValidateMatrixInput {
  readonly matrixFilePath: string;
  readonly failFast?: boolean;
}
