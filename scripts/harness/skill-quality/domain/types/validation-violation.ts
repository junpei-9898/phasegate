/**
 * @layer domain
 * @unit skill-quality
 */
export interface ValidationViolation {
  readonly ruleId: string;
  readonly message: string;
  readonly location?: string;
}
