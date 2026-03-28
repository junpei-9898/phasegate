/**
 * @layer infrastructure
 * @unit fuse-hooks-engine
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FuseHandlerPort, FuseHandlers } from '../../domain/ports/fuse-handler-port.js';
import type { PhaseGateCheckPort } from '../../domain/ports/phase-gate-check-port.js';
import type { HookEventType } from '../../domain/types/hook-event-type.js';
import { ProtectedResourceList } from '../../domain/value-objects/protected-resource-list.js';
import { FuseHooksEngineDomainError } from '../../domain/errors/fuse-hooks-engine-domain-error.js';

const EPERM = -1;
const ENOENT = -2;

export interface FusePreWriteHandlerAdapterOptions {
  protectedResources?: ProtectedResourceList;
  phaseGateCheck?: PhaseGateCheckPort;
}

interface FuseNativeOps {
  getattr(p: string, cb: (code: number, stat?: fs.Stats) => void): void;
  readdir(p: string, cb: (code: number, names?: string[]) => void): void;
  open(p: string, flags: number, cb: (code: number, fd?: number) => void): void;
  read(p: string, fd: number, buf: Buffer, len: number, pos: number, cb: (bytesRead: number) => void): void;
  write(p: string, fd: number, buf: Buffer, len: number, pos: number, cb: (bytesWritten: number) => void): void;
  create(p: string, mode: number, cb: (code: number, fd?: number) => void): void;
  release(p: string, fd: number, cb: (code: number) => void): void;
}

export class FusePreWriteHandlerAdapter implements FuseHandlerPort {
  private readonly handlers = new Map<string, FuseHandlers>();
  private readonly protectedResources: ProtectedResourceList;
  private readonly phaseGateCheck: PhaseGateCheckPort | null;
  private fuseInstance: { unmount: (cb: (err?: Error) => void) => void } | null = null;
  private _mounted = false;

  constructor(options?: FusePreWriteHandlerAdapterOptions) {
    this.protectedResources =
      options?.protectedResources ??
      ProtectedResourceList.create(['docs/principles/**'])._unsafeUnwrap();
    this.phaseGateCheck = options?.phaseGateCheck ?? null;
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

    const protectedResources = this.protectedResources;
    const phaseGateCheck = this.phaseGateCheck;
    const handlers = this.handlers;

    const ops: FuseNativeOps = {
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
        const isWriteFlag = (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR)) !== 0;
        if (isWriteFlag) {
          const relativePath = p.slice(1);
          if (protectedResources.matches(relativePath)) {
            cb(EPERM);
            return;
          }
          if (phaseGateCheck && !phaseGateCheck.isWriteAllowed(relativePath).allowed) {
            cb(EPERM);
            return;
          }
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
        try {
          const bytesRead = fs.readSync(fd, buf, 0, len, pos);
          cb(bytesRead);
        } catch {
          cb(0);
        }
      },
      write(p: string, fd: number, buf: Buffer, len: number, pos: number, cb: (bytesWritten: number) => void) {
        const relativePath = p.slice(1);
        if (protectedResources.matches(relativePath)) {
          cb(EPERM);
          return;
        }
        if (phaseGateCheck && !phaseGateCheck.isWriteAllowed(relativePath).allowed) {
          cb(EPERM);
          return;
        }
        try {
          const bytesWritten = fs.writeSync(fd, buf, 0, len, pos);
          cb(bytesWritten);
        } catch {
          cb(0);
        }
      },
      create(p: string, mode: number, cb: (code: number, fd?: number) => void) {
        const relativePath = p.slice(1);
        if (protectedResources.matches(relativePath)) {
          cb(EPERM);
          return;
        }
        if (phaseGateCheck && !phaseGateCheck.isWriteAllowed(relativePath).allowed) {
          cb(EPERM);
          return;
        }
        const realPath = path.join(sourceDir, p);
        try {
          const fd = fs.openSync(realPath, fs.constants.O_CREAT | fs.constants.O_WRONLY, mode);
          cb(0, fd);
        } catch {
          cb(ENOENT);
        }
      },
      release(p: string, fd: number, cb: (code: number) => void) {
        try {
          fs.closeSync(fd);
        } catch {
          // ignore
        }
        const mountHandler = handlers.values().next().value;
        if (mountHandler) {
          mountHandler.handle(p.slice(1), 'write').then(() => cb(0)).catch(() => cb(0));
        } else {
          cb(0);
        }
      },
    };

    const FuseConstructor = Fuse as new (mountPoint: string, ops: FuseNativeOps, options?: Record<string, unknown>) => {
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

  isProtected(filePath: string): boolean {
    return this.protectedResources.matches(filePath);
  }
}
