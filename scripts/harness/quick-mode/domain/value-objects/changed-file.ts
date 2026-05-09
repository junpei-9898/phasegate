/**
 * @layer domain
 * @unit quick-mode
 *
 * 変更ファイル1件を表す値オブジェクト
 */

import { type ChangeKind, isChangeKind } from '../types/change-kind.js';

export class ChangedFile {
  readonly filePath: string;
  readonly changeKind: ChangeKind;
  readonly beforeContent!: string | null;
  readonly afterContent!: string | null;

  private constructor(filePath: string, changeKind: ChangeKind, beforeContent: string | null, afterContent: string | null) {
    this.filePath = filePath;
    this.changeKind = changeKind;
    Object.defineProperty(this, 'beforeContent', {
      value: beforeContent,
      enumerable: false,
      writable: false,
    });
    Object.defineProperty(this, 'afterContent', {
      value: afterContent,
      enumerable: false,
      writable: false,
    });
  }

  static create(params: {
    filePath: string;
    changeKind: string;
    beforeContent?: string | null;
    afterContent?: string | null;
  }): ChangedFile {
    const { filePath, changeKind, beforeContent = null, afterContent = null } = params;

    if (!filePath) {
      throw new Error('filePath must not be empty');
    }
    if (filePath.endsWith('/')) {
      throw new Error('filePath must not end with a slash');
    }
    if (!isChangeKind(changeKind)) {
      throw new Error(`changeKind must be one of 'CREATE', 'MODIFY', 'DELETE'. Got: "${changeKind}"`);
    }

    return new ChangedFile(filePath, changeKind, beforeContent, afterContent);
  }

  isUnder(directoryPrefix: string): boolean {
    return this.filePath.startsWith(directoryPrefix);
  }

  hasExtension(ext: string): boolean {
    return this.filePath.endsWith(ext);
  }

  matchesPattern(pattern: string): boolean {
    // Glob/suffix パターンマッチング
    // '*' はワイルドカードとして扱う
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      return this.filePath.endsWith(suffix);
    }
    return this.filePath === pattern;
  }

  equals(other: ChangedFile): boolean {
    return (
      this.filePath === other.filePath &&
      this.changeKind === other.changeKind &&
      this.beforeContent === other.beforeContent &&
      this.afterContent === other.afterContent
    );
  }
}
