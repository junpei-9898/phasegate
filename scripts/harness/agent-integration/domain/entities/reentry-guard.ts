/**
 * @layer domain
 * @unit agent-integration
 *
 * ReentryGuard エンティティ
 * Stop Hook の再入を防止するための状態管理エンティティ
 */

export class ReentryGuardAlreadyActiveError extends Error {
  constructor() {
    super('ReentryGuard: 二重activate禁止（INV-1違反）。既にactive状態です。');
    this.name = 'ReentryGuardAlreadyActiveError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ReentryGuard {
  private state: 'inactive' | 'active' = 'inactive';

  isActive(): boolean {
    return this.state === 'active';
  }

  activate(): void {
    if (this.state === 'active') {
      throw new ReentryGuardAlreadyActiveError();
    }
    this.state = 'active';
  }

  deactivate(): void {
    this.state = 'inactive';
  }
}
