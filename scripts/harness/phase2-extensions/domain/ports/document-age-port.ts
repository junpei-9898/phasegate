/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { DocumentAge } from '../value-objects/document-age.js';

export interface DocumentAgePort {
  getAge(documentPath: string): Promise<DocumentAge>;
}
