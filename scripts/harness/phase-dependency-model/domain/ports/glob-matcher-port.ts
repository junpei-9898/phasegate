/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface GlobMatcherPort {
  match(pattern: string, path: string): boolean;
}
