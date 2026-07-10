// @unit ci-governance
// @layer infrastructure

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Sha256HasherPort } from "../../domain/ports/sha256-hasher-port.js";

export class FileSystemSha256HasherAdapter implements Sha256HasherPort {
  constructor(private readonly baseDir: string) {}

  async hashFile(relativePath: string): Promise<string> {
    const absPath = path.isAbsolute(relativePath) ? relativePath : path.join(this.baseDir, relativePath);
    const content = await fs.readFile(absPath);
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}
