// @unit installation
// @layer application
// @work-item-id WI-145

export interface FileInspectorPort {
  exists(absolutePath: string): Promise<boolean>;
  readText(absolutePath: string): Promise<string | null>;
  readJson<T = unknown>(absolutePath: string): Promise<T | null>;
  readSymlink(absolutePath: string): Promise<string | null>;
  listFiles(absolutePath: string): Promise<string[]>;
}
