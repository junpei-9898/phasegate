/**
 * @layer domain
 * @unit ci-governance
 *
 * PointerType・CommandPointer・FilePointer補助型
 */

export type PointerType = 'command' | 'file';

export interface CommandPointer {
  readonly type: 'command';
  readonly key: string;
  readonly command: string;
  readonly description: string;
}

export interface FilePointer {
  readonly type: 'file';
  readonly key: string;
  readonly filePath: string;
  readonly description: string;
}

export type RawPointer = CommandPointer | FilePointer;
