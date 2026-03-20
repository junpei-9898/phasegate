/**
 * @layer domain
 * @unit ci-governance
 */

import type { ErrorRepetition } from '../aggregates/error-repetition.js';

export interface ErrorRepetitionRepositoryPort {
  findByCode(code: string): Promise<ErrorRepetition | null>;
  save(errorRepetition: ErrorRepetition): Promise<void>;
}
