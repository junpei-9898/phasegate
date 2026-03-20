/**
 * @layer domain
 * @unit ci-governance
 */

export interface ValidatorIdRegistryPort {
  listAll(): Promise<string[]>;
}
