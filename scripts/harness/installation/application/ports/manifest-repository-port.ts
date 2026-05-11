// @unit installation
// @layer application
// @work-item-id WI-145

import type { DeploymentManifest } from "../../domain/deployment-manifest.js";

export interface ManifestRepositoryPort {
  load(projectRoot: string): Promise<DeploymentManifest | null>;
  save(projectRoot: string, manifest: DeploymentManifest): Promise<void>;
  exists(projectRoot: string): Promise<boolean>;
  archive(projectRoot: string): Promise<void>;
}
