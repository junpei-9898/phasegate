/**
 * @layer application
 * @unit phase2-extensions
 */
export interface ValidateDocPointersInput {
  targetPattern?: string;
  includeUrlPointers?: boolean;
  format?: 'text' | 'json';
}
