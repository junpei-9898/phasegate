/**
 * @layer domain
 * @unit ci-governance
 *
 * AgentsMdPointer集約ルート
 */

import { PointerEntry } from '../value-objects/pointer-entry.js';
import type { FilePointer } from '../types/pointer-type.js';
import { CiGovernanceDomainError } from '../errors/ci-governance-domain-error.js';

export class AgentsMdPointer {
  readonly pointers: readonly PointerEntry[];
  readonly adrLinks: readonly string[];

  private constructor(pointers: PointerEntry[], adrLinks: string[]) {
    this.pointers = Object.freeze([...pointers]);
    this.adrLinks = Object.freeze([...adrLinks]);
  }

  static create(pointers: PointerEntry[] = [], adrLinks: string[] = []): AgentsMdPointer {
    AgentsMdPointer.checkUniqueKeys(pointers);
    return new AgentsMdPointer(pointers, adrLinks);
  }

  /** テスト用: バリデーションをスキップして内部状態を直接設定する */
  static createForTest(rawPointers: Array<{ type: 'command' | 'file'; key: string; [k: string]: unknown }>): AgentsMdPointer {
    // We create a special instance that bypasses PointerEntry validation
    const instance = new AgentsMdPointer([], []);
    // Override readonly pointers using Object.defineProperty for test purposes
    const syntheticPointers = rawPointers.map((raw) => {
      // Create a fake PointerEntry-like object for test purposes
      const fakeEntry = Object.create(PointerEntry.prototype) as PointerEntry;
      Object.defineProperty(fakeEntry, 'type', { value: raw.type, enumerable: true });
      Object.defineProperty(fakeEntry, 'key', { value: raw.key, enumerable: true });
      if (raw.type === 'file') {
        const fp = raw as unknown as FilePointer;
        Object.defineProperty(fakeEntry, 'filePath', { value: fp.filePath, enumerable: true });
      }
      return fakeEntry;
    });
    Object.defineProperty(instance, 'pointers', { value: Object.freeze(syntheticPointers) });
    return instance;
  }

  private static checkUniqueKeys(pointers: PointerEntry[]): void {
    const keys = pointers.map((p) => p.key);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      throw new CiGovernanceDomainError(
        'AGENTS_MD_DUPLICATE_KEY',
        'INV-8: All PointerEntry keys must be unique',
      );
    }
  }

  addPointer(entry: PointerEntry): AgentsMdPointer {
    const existingKeys = this.pointers.map((p) => p.key);
    if (existingKeys.includes(entry.key)) {
      throw new CiGovernanceDomainError(
        'AGENTS_MD_DUPLICATE_KEY',
        `INV-8: PointerEntry key '${entry.key}' already exists`,
      );
    }
    return new AgentsMdPointer([...this.pointers, entry], [...this.adrLinks]);
  }

  replacePointer(entry: PointerEntry): AgentsMdPointer {
    const existingIndex = this.pointers.findIndex((p) => p.key === entry.key);
    if (existingIndex === -1) {
      // Add as new
      return new AgentsMdPointer([...this.pointers, entry], [...this.adrLinks]);
    }
    const newPointers = this.pointers.map((p, i) => (i === existingIndex ? entry : p));
    return new AgentsMdPointer([...newPointers], [...this.adrLinks]);
  }

  validate(): Array<{ code: string; message: string }> {
    const errors: Array<{ code: string; message: string }> = [];

    for (const pointer of this.pointers) {
      if (pointer.isFile()) {
        const fp = pointer as PointerEntry;
        const filePath = fp.filePath;
        if (filePath && filePath.startsWith('/')) {
          errors.push({
            code: 'AGENTS_MD_INVALID_PATH',
            message: `INV-11: FilePointer.filePath must be relative, got absolute path: ${filePath}`,
          });
        }
      }
    }

    return errors;
  }
}
