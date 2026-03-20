/**
 * @layer domain
 * @unit phase2-extensions
 */
export class Phase2ExtensionsDomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'Phase2ExtensionsDomainError';
    this.code = code;
  }
}
