/**
 * @layer domain
 * @unit agent-integration
 *
 * HookEvent Union型値オブジェクト
 */

export class UnsupportedHookTypeError extends Error {
  constructor(hookType: string) {
    super(`未サポートのhookTypeです: ${hookType}`);
    this.name = 'UnsupportedHookTypeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type HookEventInput =
  | { hookType: 'pre-tool-use'; toolName: string; targetFilePaths: string[] }
  | { hookType: 'post-tool-use'; toolName: string; affectedFilePaths: string[] }
  | { hookType: 'stop'; sessionId: string };

export abstract class HookEvent {
  abstract readonly hookType: string;

  abstract equals(other: HookEvent): boolean;

  isPreToolUse(): this is PreToolUseEvent {
    return this.hookType === 'pre-tool-use';
  }

  isPostToolUse(): this is PostToolUseEvent {
    return this.hookType === 'post-tool-use';
  }

  isStop(): this is StopEvent {
    return this.hookType === 'stop';
  }

  static create(input: HookEventInput | Record<string, unknown>): HookEvent {
    const hookType = (input as Record<string, unknown>).hookType;
    if (hookType === 'pre-tool-use') {
      const i = input as { hookType: 'pre-tool-use'; toolName: string; targetFilePaths: string[] };
      return PreToolUseEvent.create(i);
    }
    if (hookType === 'post-tool-use') {
      const i = input as { hookType: 'post-tool-use'; toolName: string; affectedFilePaths: string[] };
      return PostToolUseEvent.create(i);
    }
    if (hookType === 'stop') {
      const i = input as { hookType: 'stop'; sessionId: string };
      return StopEvent.create(i);
    }
    throw new UnsupportedHookTypeError(String(hookType));
  }

  static createPreToolUse(toolName: string, targetFilePaths: string[]): HookEvent {
    return PreToolUseEvent.create({ hookType: 'pre-tool-use', toolName, targetFilePaths });
  }

  static createPostToolUse(toolName: string, affectedFilePaths: string[]): HookEvent {
    return PostToolUseEvent.create({ hookType: 'post-tool-use', toolName, affectedFilePaths });
  }

  static createStop(sessionId: string): HookEvent {
    return StopEvent.create({ hookType: 'stop', sessionId });
  }
}

export class PreToolUseEvent extends HookEvent {
  readonly hookType = 'pre-tool-use' as const;
  readonly toolName: string;
  readonly targetFilePaths: readonly string[];

  private constructor(toolName: string, targetFilePaths: string[]) {
    super();
    this.toolName = toolName;
    this.targetFilePaths = Object.freeze([...targetFilePaths]);
  }

  static create(input: { hookType: 'pre-tool-use'; toolName: string; targetFilePaths: string[] }): PreToolUseEvent {
    return new PreToolUseEvent(input.toolName, input.targetFilePaths);
  }

  equals(other: HookEvent): boolean {
    if (!(other instanceof PreToolUseEvent)) return false;
    if (this.toolName !== other.toolName) return false;
    if (this.targetFilePaths.length !== other.targetFilePaths.length) return false;
    return this.targetFilePaths.every((p, i) => p === other.targetFilePaths[i]);
  }
}

export class PostToolUseEvent extends HookEvent {
  readonly hookType = 'post-tool-use' as const;
  readonly toolName: string;
  readonly affectedFilePaths: readonly string[];

  private constructor(toolName: string, affectedFilePaths: string[]) {
    super();
    this.toolName = toolName;
    this.affectedFilePaths = Object.freeze([...affectedFilePaths]);
  }

  static create(input: { hookType: 'post-tool-use'; toolName: string; affectedFilePaths: string[] }): PostToolUseEvent {
    return new PostToolUseEvent(input.toolName, input.affectedFilePaths);
  }

  equals(other: HookEvent): boolean {
    if (!(other instanceof PostToolUseEvent)) return false;
    if (this.toolName !== other.toolName) return false;
    if (this.affectedFilePaths.length !== other.affectedFilePaths.length) return false;
    return this.affectedFilePaths.every((p, i) => p === other.affectedFilePaths[i]);
  }
}

export class StopEvent extends HookEvent {
  readonly hookType = 'stop' as const;
  readonly sessionId: string;

  private constructor(sessionId: string) {
    super();
    if (!sessionId) {
      throw new Error('sessionIdは空文字不可');
    }
    this.sessionId = sessionId;
  }

  static create(input: { hookType: 'stop'; sessionId: string }): StopEvent {
    return new StopEvent(input.sessionId);
  }

  equals(other: HookEvent): boolean {
    if (!(other instanceof StopEvent)) return false;
    return this.sessionId === other.sessionId;
  }
}
