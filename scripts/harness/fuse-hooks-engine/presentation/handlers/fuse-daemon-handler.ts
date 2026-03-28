/**
 * @layer presentation
 * @unit fuse-hooks-engine
 *
 * FuseDaemonHandler — fuse:mount / fuse:unmount / fuse:status CLIハンドラー
 */
import { FUSEMount } from '../../domain/entities/fuse-mount.js';
import type { FuseHandlerPort } from '../../domain/ports/fuse-handler-port.js';
import type { GuardMode } from '../../domain/types/guard-mode.js';

export interface FuseDaemonHandlerDeps {
  fuseMount: FUSEMount;
  fuseWriteHandler: FuseHandlerPort & { mount?(sourceDir: string, mountPoint: string): Promise<void>; unmount?(): Promise<void>; isMounted?: boolean };
  fuseReadHandler: FuseHandlerPort & { mount?(sourceDir: string, mountPoint: string): Promise<void>; unmount?(): Promise<void>; isMounted?: boolean };
  guardMode: GuardMode;
}

export interface FuseDaemonResult {
  output: string;
  exitCode: number;
}

export class FuseDaemonHandler {
  private readonly deps: FuseDaemonHandlerDeps;

  constructor(deps: FuseDaemonHandlerDeps) {
    this.deps = deps;
  }

  async handle(args: string[]): Promise<FuseDaemonResult> {
    const subcommand = args[0] ?? 'status';

    switch (subcommand) {
      case 'mount':
        return this.handleMount(args);
      case 'unmount':
        return this.handleUnmount();
      case 'status':
        return this.handleStatus();
      default:
        return {
          output: `Unknown fuse subcommand: ${subcommand}. Use mount, unmount, or status.`,
          exitCode: 2,
        };
    }
  }

  private async handleMount(args: string[]): Promise<FuseDaemonResult> {
    if (this.deps.guardMode === 'hooks') {
      return {
        output: 'guardMode is set to "hooks". FUSE mount is not available in hooks mode.\nChange guardMode to "fuse" or "auto" in harness.config.json to use FUSE.',
        exitCode: 1,
      };
    }

    const sourceDir = args[1] ?? process.cwd();
    const mountPoint = args[2] ?? '.workspace';

    try {
      if (this.deps.fuseWriteHandler.mount) {
        await this.deps.fuseWriteHandler.mount(sourceDir, mountPoint);
      }
      if (this.deps.fuseReadHandler.mount) {
        await this.deps.fuseReadHandler.mount(sourceDir, mountPoint);
      }
      this.deps.fuseMount.mount({ sourceDir, mountPoint });

      return {
        output: `FUSE mounted: ${sourceDir} → ${mountPoint}\nMode: ${this.deps.guardMode}\nStatus: mounted`,
        exitCode: 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.deps.fuseMount.enterFallback('L3');

      return {
        output: `FUSE mount failed: ${message}\nFalling back to hooks mode.`,
        exitCode: 1,
      };
    }
  }

  private async handleUnmount(): Promise<FuseDaemonResult> {
    try {
      if (this.deps.fuseWriteHandler.unmount) {
        await this.deps.fuseWriteHandler.unmount();
      }
      if (this.deps.fuseReadHandler.unmount) {
        await this.deps.fuseReadHandler.unmount();
      }

      return {
        output: 'FUSE unmounted successfully.',
        exitCode: 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        output: `FUSE unmount failed: ${message}`,
        exitCode: 1,
      };
    }
  }

  private handleStatus(): FuseDaemonResult {
    const status = {
      guardMode: this.deps.guardMode,
      mountStatus: this.deps.fuseMount.status,
      isFallback: this.deps.fuseMount.isFallback(),
      fallbackMode: this.deps.fuseMount.getFallbackMode(),
    };

    return {
      output: JSON.stringify(status, null, 2),
      exitCode: 0,
    };
  }
}
