/**
 * @layer domain
 * @unit phase2-extensions
 */
export interface FrontmatterFlags {
  initialCreation: boolean;
}

export interface FrontmatterReadResult {
  filePath: string;
  flags: FrontmatterFlags | null;
  parseError: string | null;
}

export interface FrontmatterReaderPort {
  read(filePath: string): Promise<FrontmatterReadResult>;
}
