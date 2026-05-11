// @unit installation
// @layer domain
// @work-item-id WI-146

export interface FileInspector {
  exists(absolutePath: string): Promise<boolean>;
  readText(absolutePath: string): Promise<string | null>;
  readJson<T = unknown>(absolutePath: string): Promise<T | null>;
  readSymlink(absolutePath: string): Promise<string | null>;
  listFiles(absolutePath: string): Promise<string[]>;
}
