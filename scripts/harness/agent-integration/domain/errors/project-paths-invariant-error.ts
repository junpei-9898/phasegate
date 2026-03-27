// @unit agent-integration
// @layer domain

export class ProjectPathsInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectPathsInvariantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
