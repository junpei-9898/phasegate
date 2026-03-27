/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FuseHandlerPort, FuseHandlers } from '../../domain/ports/fuse-handler-port.js';
import type { HookEventType } from '../../domain/types/hook-event-type.js';
import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';

const EPERM = -1;
const ENOENT = -2;

const DEFAULT_SENSITIVE_PATTERNS = [
  /\.env$/,
  /\.env\..+$/,
  /\.key$/,
  /\.pem$/,
  /\.p12$/,
  /\.pfx$/,
  /credentials\.json$/,
  /secret[s]?\.json$/,
  /\.secret$/,
];

export interface FusePreReadHandlerAdapterOptions {
  sensitivePatterns?: readonly RegExp[];
}

export class FusePreReadHandlerAdapter implements FuseHandlerPort {
  private readonly handlers = new Map<string, FuseHandlers>();
  private readonly sensitivePatterns: readonly RegExp[];
  private fuseInstance: { unmount: (cb: (err?: Error) => void) => void } | null = null;
  private _mounted = false;

  constructor(options?: FusePreReadHandlerAdapterOptions) {
    this.sensitivePatterns = options?.sensitivePatterns ?? DEFAULT_SENSITIVE_PATTERNS;
  }

  async register(mountPath: string, handlers: FuseHandlers): Promise<void> {
    this.handlers.set(mountPath, handlers);
  }

  async dispatch(mountPath: string, filePath: string, eventType: HookEventType): Promise<void> {
    const handler = this.handlers.get(mountPath);
    if (handler) {
      await handler.handle(filePath, eventType);
    }
  }

  get isMounted(): boolean {
    return this._mounted;
  }

  isSensitiveFile(filePath: string): boolean {
    const basename = path.basename(filePath);
    return this.sensitivePatterns.some((pattern) => pattern.test(basename) || pattern.test(filePath));
  }

  static async isFuseAvailable(): Promise<boolean> {
    try {
      await import('fuse-native');
      return true;
    } catch {
      return false;
    }
  }

  async mount(sourceDir: string, mountPoint: string): Promise<void> {
    let Fuse: unknown;
    try {
      const mod = await import('fuse-native');
      Fuse = mod.default ?? mod;
    } catch {
      throw new FuseHooksEngineDomainError(
        'FUSE_NOT_AVAILABLE',
        'fuse-native is not installed or FUSE is not available on this system',
      );
    }

    const sensitivePatterns = this.sensitivePatterns;
    const isSensitive = (filePath: string) => {
      const basename = path.basename(filePath);
      return sensitivePatterns.some((p) => p.test(basename) || p.test(filePath));
    };

    const ops = {
      getattr(p: string, cb: (code: number, stat?: fs.Stats) => void) {
        const realPath = path.join(sourceDir, p);
        try {
          const stat = fs.statSync(realPath);
          cb(0, stat);
        } catch {
          cb(ENOENT);
        }
      },
      readdir(p: string, cb: (code: number, names?: string[]) => void) {
        const realPath = path.join(sourceDir, p);
        try {
          const entries = fs.readdirSync(realPath);
          cb(0, entries);
        } catch {
          cb(ENOENT);
        }
      },
      open(p: string, flags: number, cb: (code: number, fd?: number) => void) {
        const isReadFlag = (flags & fs.constants.O_RDONLY) === fs.constants.O_RDONLY
          || (flags & fs.constants.O_RDWR) !== 0;
        if (isReadFlag && isSensitive(p.slice(1))) {
          cb(EPERM);
          return;
        }
        const realPath = path.join(sourceDir, p);
        try {
          const fd = fs.openSync(realPath, flags);
          cb(0, fd);
        } catch {
          cb(ENOENT);
        }
      },
      read(p: string, fd: number, buf: Buffer, len: number, pos: number, cb: (bytesRead: number) => void) {
        if (isSensitive(p.slice(1))) {
          cb(EPERM);
          return;
        }
        try {
          const bytesRead = fs.readSync(fd, buf, 0, len, pos);
          cb(bytesRead);
        } catch {
          cb(0);
        }
      },
      release(p: string, fd: number, cb: (code: number) => void) {
        try {
          fs.closeSync(fd);
        } catch {
          // ignore
        }
        cb(0);
      },
    };

    const FuseConstructor = Fuse as new (mountPoint: string, ops: unknown, options?: Record<string, unknown>) => {
      mount(cb: (err?: Error) => void): void;
      unmount(cb: (err?: Error) => void): void;
    };

    return new Promise<void>((resolve, reject) => {
      const fuse = new FuseConstructor(mountPoint, ops, { force: true, mkdir: true });
      fuse.mount((err?: Error) => {
        if (err) {
          reject(new FuseHooksEngineDomainError(
            'FUSE_MOUNT_FAILED',
            `Failed to mount FUSE: ${err.message}`,
          ));
          return;
        }
        this.fuseInstance = fuse;
        this._mounted = true;
        resolve();
      });
    });
  }

  async unmount(): Promise<void> {
    if (!this.fuseInstance) return;
    return new Promise<void>((resolve, reject) => {
      this.fuseInstance!.unmount((err?: Error) => {
        this._mounted = false;
        this.fuseInstance = null;
        if (err) {
          reject(new FuseHooksEngineDomainError('FUSE_UNMOUNT_FAILED', err.message));
          return;
        }
        resolve();
      });
    });
  }
}
