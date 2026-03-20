/**
 * @layer domain
 * @unit ci-governance
 */

export interface FileExistencePort {
  exists(filePath: string): Promise<boolean>;
}
