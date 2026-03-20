/**
 * @layer domain
 * @unit phase2-extensions
 */
export interface DocumentScannerPort {
  scan(pattern: string): Promise<string[]>;
}
