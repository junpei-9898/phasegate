/**
 * @layer domain
 * @unit skill-quality
 */

export interface ValidatorIdRegistryPort {
  list(): Promise<readonly string[]>;
}
