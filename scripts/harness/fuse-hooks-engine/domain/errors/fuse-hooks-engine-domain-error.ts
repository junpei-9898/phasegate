/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

export class FuseHooksEngineDomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FuseHooksEngineDomainError';
    this.code = code;
  }
}
