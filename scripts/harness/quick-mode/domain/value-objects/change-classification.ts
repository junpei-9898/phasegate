/**
 * @layer domain
 * @unit quick-mode
 *
 * ChangedFile[]の分類結果を表す値オブジェクト
 */

import type { ChangeCategory } from './change-category.js';
import type { ChangedFile } from './changed-file.js';

export class ChangeClassification {
  readonly dominantCategory: ChangeCategory | null;
  readonly categorizedFiles: ReadonlyMap<string, readonly ChangedFile[]>;
  readonly totalFiles: number;

  constructor(
    dominantCategory: ChangeCategory | null,
    categorizedFiles: ReadonlyMap<string, readonly ChangedFile[]>,
    totalFiles: number
  ) {
    this.dominantCategory = dominantCategory;
    this.categorizedFiles = categorizedFiles;
    this.totalFiles = totalFiles;
  }

  getFiles(category: ChangeCategory | string): readonly ChangedFile[] {
    const key = typeof category === 'string' ? category : category.toString();
    return this.categorizedFiles.get(key) ?? [];
  }

  hasCategory(category: ChangeCategory | string): boolean {
    const key = typeof category === 'string' ? category : category.toString();
    const files = this.categorizedFiles.get(key);
    return files !== undefined && files.length > 0;
  }

  hasAnyRejectable(): boolean {
    return (
      this.hasCategory('domain') ||
      this.hasCategory('feature') ||
      this.hasCategory('api')
    );
  }

  equals(other: ChangeClassification): boolean {
    if (this.totalFiles !== other.totalFiles) return false;
    if (this.dominantCategory?.toString() !== other.dominantCategory?.toString()) return false;

    let equal = true;
    this.categorizedFiles.forEach((files, key) => {
      if (!equal) return;
      const otherFiles = other.categorizedFiles.get(key);
      if (!otherFiles || files.length !== otherFiles.length) {
        equal = false;
        return;
      }
      for (let i = 0; i < files.length; i++) {
        if (!files[i].equals(otherFiles[i])) {
          equal = false;
          return;
        }
      }
    });
    if (!equal) return false;

    return true;
  }
}
