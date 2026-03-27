// @unit agent-integration
// @layer domain

export class WriteTargetScopeInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WriteTargetScopeInvariantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
