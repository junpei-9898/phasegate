// @unit ci-governance
// @layer domain

export interface FileScanOptions {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

export interface FileScannerPort {
  scan(options: FileScanOptions): Promise<readonly string[]>;
}
