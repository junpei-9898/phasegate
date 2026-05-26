/**
 * @layer application
 * @unit validator-system
 *
 * ValidationResultContract — 公開契約DTO
 * H08-01〜H08-06が生成し、harness-api・quick-modeが消費する
 */

export interface ValidationResultContract {
  readonly validatorId: string;
  readonly passed: boolean;
  readonly errors: readonly {
    readonly code: string;
    readonly severity: string;
    readonly message: string;
    readonly suggestion: string;
    [key: string]: unknown;
  }[];
  readonly durationMs: number;
  readonly skipped?: boolean;
  readonly skipReason?: string;
}
