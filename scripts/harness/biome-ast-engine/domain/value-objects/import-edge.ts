/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from './file-path.js';

export type ImportKind = 'value' | 'type' | 'dynamic';

const VALID_IMPORT_KINDS = new Set<ImportKind>(['value', 'type', 'dynamic']);

export class InvalidImportKindError extends Error {
  constructor(value: string) {
    super(`Invalid ImportKind: ${value}`);
    this.name = 'InvalidImportKindError';
  }
}

type ImportEdgeProps = {
  readonly from: FilePath;
  readonly to: FilePath;
  readonly importKind: ImportKind;
};

export class ImportEdge {
  readonly from: FilePath;
  readonly to: FilePath;
  readonly importKind: ImportKind;

  private constructor(props: ImportEdgeProps) {
    this.from = props.from;
    this.to = props.to;
    this.importKind = props.importKind;
  }

  static create(props: ImportEdgeProps): ImportEdge {
    if (!VALID_IMPORT_KINDS.has(props.importKind)) {
      throw new InvalidImportKindError(props.importKind);
    }

    return Object.freeze(new ImportEdge(props));
  }

  equals(other: ImportEdge): boolean {
    return (
      this.from.equals(other.from) &&
      this.to.equals(other.to) &&
      this.importKind === other.importKind
    );
  }

  isTypeOnly(): boolean {
    return this.importKind === 'type';
  }

  touches(filePath: FilePath): boolean {
    return this.from.equals(filePath) || this.to.equals(filePath);
  }
}
