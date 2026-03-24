/**
 * @layer domain
 * @unit skill-quality
 */

export interface FileSystemPort {
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
  glob(pattern: string): Promise<readonly string[]>;
}
