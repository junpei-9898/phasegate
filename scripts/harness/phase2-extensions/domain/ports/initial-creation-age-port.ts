/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { InitialCreationAge } from '../value-objects/initial-creation-age.js';

export interface InitialCreationAgePort {
  getAge(filePath: string): Promise<InitialCreationAge>;
}
