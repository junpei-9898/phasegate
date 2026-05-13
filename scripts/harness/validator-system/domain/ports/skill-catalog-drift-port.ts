/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-156
 */
import type { SkillCatalogSnapshot } from '../services/l4/skill-catalog-drift-service.js';

export interface SkillCatalogDriftPort {
  collect(): Promise<SkillCatalogSnapshot>;
}
