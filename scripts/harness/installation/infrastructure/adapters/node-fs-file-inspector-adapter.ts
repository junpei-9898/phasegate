// @unit installation
// @layer infrastructure
// @work-item-id WI-145

import { lstat, readFile, readlink, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { FileInspectorPort } from "../../application/ports/file-inspector-port.js";

export class NodeFsFileInspectorAdapter implements FileInspectorPort {
  async exists(absolutePath: string): Promise<boolean> {
    try {
      await lstat(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async readText(absolutePath: string): Promise<string | null> {
    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      return null;
    }
  }

  async readJson<T = unknown>(absolutePath: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(absolutePath, "utf8")) as T;
    } catch {
      return null;
    }
  }

  async readSymlink(absolutePath: string): Promise<string | null> {
    try {
      const stats = await lstat(absolutePath);
      if (!stats.isSymbolicLink()) return null;
      return await readlink(absolutePath);
    } catch {
      return null;
    }
  }

  async listFiles(absolutePath: string): Promise<string[]> {
    try {
      const entries = await readdir(absolutePath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => join(absolutePath, entry.name));
    } catch {
      return [];
    }
  }
}
