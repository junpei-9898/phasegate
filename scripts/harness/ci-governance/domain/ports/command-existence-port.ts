/**
 * @layer domain
 * @unit ci-governance
 */

export interface CommandExistencePort {
  exists(command: string): Promise<boolean>;
}
