/**
 * @layer domain
 * @unit agent-integration
 *
 * HookToCliTranslator ドメインサービス
 * HookEvent を HookTranslationResult に変換する変換ルールをカプセル化する
 */

import type { HookEvent, PreToolUseEvent, PostToolUseEvent, StopEvent } from '../value-objects/hook-event.js';
import { HookTranslationResult } from '../value-objects/hook-translation-result.js';
import { ProtectedFileList } from '../value-objects/protected-file-list.js';
import type { ReentryGuard } from '../entities/reentry-guard.js';
import type { CliCommandRegistryPort } from '../ports/cli-command-registry-port.js';
import type { ConfigQueryPort } from '../ports/config-query-port.js';

export class UnsupportedHookTypeError extends Error {
  constructor(hookType: string) {
    super(`未サポートのhookTypeです: ${hookType}`);
    this.name = 'UnsupportedHookTypeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CommandNotRegisteredError extends Error {
  constructor(commandName: string) {
    super(`CLIコマンドが未登録です: ${commandName}`);
    this.name = 'CommandNotRegisteredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface HookToCliTranslatorPorts {
  configQueryPort: {
    isEnabled?: (hookType: string) => boolean | Promise<boolean>;
    getProtectedFileList?: () => ProtectedFileList | Promise<ProtectedFileList>;
    isHookEnabled?: (hookType: string) => boolean | Promise<boolean>;
    getProtectedFilePatterns?: () => string[] | Promise<string[]>;
  };
  reentryGuardStatePort: {
    isActive: () => boolean | Promise<boolean>;
  };
  cliCommandRegistryPort: {
    has?: (command: string) => boolean | Promise<boolean>;
    hasCommand?: (command: string) => boolean | Promise<boolean>;
    get?: (command: string) => string | undefined;
  };
}

export class HookToCliTranslator {
  private readonly configQueryPort: HookToCliTranslatorPorts['configQueryPort'];
  private readonly reentryGuardStatePort: HookToCliTranslatorPorts['reentryGuardStatePort'];
  private readonly cliCommandRegistryPort: HookToCliTranslatorPorts['cliCommandRegistryPort'];

  constructor(ports: HookToCliTranslatorPorts) {
    this.configQueryPort = ports.configQueryPort;
    this.reentryGuardStatePort = ports.reentryGuardStatePort;
    this.cliCommandRegistryPort = ports.cliCommandRegistryPort;
  }

  translate(hookEvent: HookEvent): HookTranslationResult {
    if (hookEvent.isPreToolUse()) {
      return this.translatePreToolUse(hookEvent as PreToolUseEvent);
    }
    if (hookEvent.isPostToolUse()) {
      return this.translatePostToolUse(hookEvent as PostToolUseEvent);
    }
    if (hookEvent.isStop()) {
      return this.translateStop(hookEvent as StopEvent);
    }
    throw new UnsupportedHookTypeError((hookEvent as HookEvent).hookType);
  }

  private translatePreToolUse(event: PreToolUseEvent): HookTranslationResult {
    // Get protected file list from port
    let protectedFileList: ProtectedFileList;

    if (this.configQueryPort.getProtectedFileList) {
      const result = this.configQueryPort.getProtectedFileList();
      if (result instanceof Promise) {
        throw new Error('Async not supported in sync translate. Use translateAsync.');
      }
      protectedFileList = result;
    } else {
      protectedFileList = ProtectedFileList.createDefault();
    }

    const blockedPath = event.targetFilePaths.find((fp) => protectedFileList.matches(fp));
    if (blockedPath !== undefined) {
      return HookTranslationResult.block();
    }
    return HookTranslationResult.create({
      shouldBlock: false,
      cliArgs: [],
      expectedExitCode: 0,
    });
  }

  private translatePostToolUse(event: PostToolUseEvent): HookTranslationResult {
    const isEnabled = (() => {
      const port = this.configQueryPort;
      if (port.isEnabled) {
        const r = port.isEnabled('post-tool-use');
        if (r instanceof Promise) throw new Error('Async not supported in sync translate.');
        return r;
      }
      if (port.isHookEnabled) {
        const r = port.isHookEnabled('post-tool-use');
        if (r instanceof Promise) throw new Error('Async not supported in sync translate.');
        return r;
      }
      return true;
    })();

    if (!isEnabled) {
      return HookTranslationResult.skip('HOOK_DISABLED');
    }

    // Check command registry
    const commandName = 'harness:lint';
    const hasCommand = (() => {
      const reg = this.cliCommandRegistryPort;
      if (reg.has) {
        const r = reg.has(commandName);
        if (r instanceof Promise) throw new Error('Async not supported in sync translate.');
        return r;
      }
      if (reg.hasCommand) {
        const r = reg.hasCommand(commandName);
        if (r instanceof Promise) throw new Error('Async not supported in sync translate.');
        return r;
      }
      return false;
    })();

    if (!hasCommand) {
      throw new CommandNotRegisteredError(commandName);
    }

    return HookTranslationResult.execute(commandName, ['--fast'], 0, 500);
  }

  private translateStop(_event: StopEvent): HookTranslationResult {
    const isActive = (() => {
      const r = this.reentryGuardStatePort.isActive();
      if (r instanceof Promise) throw new Error('Async not supported in sync translate.');
      return r;
    })();

    if (isActive) {
      return HookTranslationResult.skip('REENTRY_DETECTED');
    }

    return HookTranslationResult.execute('harness:complete-check', [], 0);
  }
}

/**
 * 非同期版 HookToCliTranslator
 * UseCase と Infrastructure で使用する本番実装
 */
export class AsyncHookToCliTranslator {
  private readonly configQueryPort: ConfigQueryPort;
  private readonly reentryGuard: ReentryGuard;
  private readonly cliCommandRegistryPort: {
    hasCommand(commandName: string): Promise<boolean>;
  };

  constructor(deps: {
    configQueryPort: ConfigQueryPort;
    reentryGuard: ReentryGuard;
    cliCommandRegistryPort: { hasCommand(commandName: string): Promise<boolean> };
  }) {
    this.configQueryPort = deps.configQueryPort;
    this.reentryGuard = deps.reentryGuard;
    this.cliCommandRegistryPort = deps.cliCommandRegistryPort;
  }

  async translate(hookEvent: HookEvent): Promise<HookTranslationResult> {
    if (hookEvent.isPreToolUse()) {
      return this.translatePreToolUse(hookEvent as PreToolUseEvent);
    }
    if (hookEvent.isPostToolUse()) {
      return this.translatePostToolUse(hookEvent as PostToolUseEvent);
    }
    if (hookEvent.isStop()) {
      return this.translateStop(hookEvent as StopEvent);
    }
    throw new UnsupportedHookTypeError((hookEvent as HookEvent).hookType);
  }

  private async translatePreToolUse(event: PreToolUseEvent): Promise<HookTranslationResult> {
    const additionalPatterns = await this.configQueryPort.getProtectedFilePatterns();
    const protectedFileList = ProtectedFileList.createWithAdditional(additionalPatterns);

    const blockedPath = event.targetFilePaths.find((fp) => protectedFileList.matches(fp));
    if (blockedPath !== undefined) {
      return HookTranslationResult.block();
    }
    return HookTranslationResult.create({
      shouldBlock: false,
      cliArgs: [],
      expectedExitCode: 0,
    });
  }

  private async translatePostToolUse(_event: PostToolUseEvent): Promise<HookTranslationResult> {
    const isEnabled = await this.configQueryPort.isHookEnabled('post-tool-use');
    if (!isEnabled) {
      return HookTranslationResult.skip('HOOK_DISABLED');
    }

    const commandName = 'harness:lint';
    const hasCommand = await this.cliCommandRegistryPort.hasCommand(commandName);
    if (!hasCommand) {
      throw new CommandNotRegisteredError(commandName);
    }

    return HookTranslationResult.execute(commandName, ['--fast'], 0, 500);
  }

  private async translateStop(_event: StopEvent): Promise<HookTranslationResult> {
    const isActive = this.reentryGuard.isActive();
    if (isActive) {
      return HookTranslationResult.skip('REENTRY_DETECTED');
    }
    return HookTranslationResult.execute('harness:complete-check', [], 0);
  }
}
