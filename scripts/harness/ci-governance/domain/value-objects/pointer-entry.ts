/**
 * @layer domain
 * @unit ci-governance
 *
 * PointerEntry VO（CommandPointer | FilePointer Union）
 */

import type { CommandPointer, FilePointer } from '../types/pointer-type.js';

export type { CommandPointer, FilePointer };

export class PointerEntry {
  readonly type: 'command' | 'file';
  readonly key: string;
  private readonly _data: CommandPointer | FilePointer;

  private constructor(data: CommandPointer | FilePointer) {
    this._data = data;
    this.type = data.type;
    this.key = data.key;
  }

  static createCommand(props: { key: string; command: string; description: string }): PointerEntry {
    if (!props.key || props.key.trim() === '') {
      throw new Error('PointerEntry key cannot be empty');
    }
    if (!props.command || props.command.trim() === '') {
      throw new Error('CommandPointer command cannot be empty');
    }
    const data: CommandPointer = {
      type: 'command',
      key: props.key,
      command: props.command,
      description: props.description,
    };
    return new PointerEntry(data);
  }

  static createFile(props: { key: string; filePath: string; description: string }): PointerEntry {
    if (!props.key || props.key.trim() === '') {
      throw new Error('PointerEntry key cannot be empty');
    }
    if (props.filePath.startsWith('/')) {
      throw new Error('INV-11: FilePointer.filePath must be a relative path (not absolute)');
    }
    const data: FilePointer = {
      type: 'file',
      key: props.key,
      filePath: props.filePath,
      description: props.description,
    };
    return new PointerEntry(data);
  }

  isCommand(): boolean {
    return this.type === 'command';
  }

  isFile(): boolean {
    return this.type === 'file';
  }

  get command(): string | undefined {
    if (this._data.type === 'command') return this._data.command;
    return undefined;
  }

  get filePath(): string | undefined {
    if (this._data.type === 'file') return this._data.filePath;
    return undefined;
  }

  get description(): string {
    return this._data.description;
  }

  toRaw(): CommandPointer | FilePointer {
    return this._data;
  }
}
