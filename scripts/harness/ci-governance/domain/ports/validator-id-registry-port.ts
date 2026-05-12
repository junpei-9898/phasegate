/**
 * @layer domain
 * @unit ci-governance
 */

export interface ValidatorIdRegistryPort {
  listAll(): Promise<string[]>;
  listForPreset?(presetId: string, templateType: string): Promise<string[]>;
}
