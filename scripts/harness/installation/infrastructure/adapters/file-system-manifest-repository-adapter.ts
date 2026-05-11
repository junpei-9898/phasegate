// @unit installation
// @layer infrastructure
// @work-item-id WI-145

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, access } from "node:fs/promises";
import { join } from "node:path";
import { DeploymentManifest, type DeploymentManifestJson } from "../../domain/deployment-manifest.js";
import type { ManifestRepositoryPort } from "../../application/ports/manifest-repository-port.js";

export class ManifestParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestParseError";
  }
}

export class FileSystemManifestRepositoryAdapter implements ManifestRepositoryPort {
  async load(projectRoot: string): Promise<DeploymentManifest | null> {
    const manifestPath = this.manifestPath(projectRoot);
    let raw: string;
    try {
      raw = await readFile(manifestPath, "utf8");
    } catch {
      return null;
    }
    try {
      return DeploymentManifest.fromJSON(JSON.parse(raw) as DeploymentManifestJson);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ManifestParseError(`Failed to parse .phasegate/manifest.json: ${message}`);
    }
  }

  async save(projectRoot: string, manifest: DeploymentManifest): Promise<void> {
    const phasegateDir = join(projectRoot, ".phasegate");
    await mkdir(phasegateDir, { recursive: true });
    const tmpPath = join(phasegateDir, `${randomUUID()}.tmp`);
    const manifestPath = this.manifestPath(projectRoot);
    const content = `${JSON.stringify(manifest.toJSON(), null, 2)}\n`;
    const { writeFile } = await import("node:fs/promises");
    await writeFile(tmpPath, content, "utf8");
    await rename(tmpPath, manifestPath);
  }

  async exists(projectRoot: string): Promise<boolean> {
    try {
      await access(this.manifestPath(projectRoot));
      return true;
    } catch {
      return false;
    }
  }

  async archive(_projectRoot: string): Promise<void> {
    throw new Error("Not yet implemented: manifest archive is owned by WI-147");
  }

  private manifestPath(projectRoot: string): string {
    return join(projectRoot, ".phasegate", "manifest.json");
  }
}
