// @unit installation
// @layer domain
// @work-item-id WI-145

import type { DeploymentManifest } from "../deployment-manifest.js";

export interface ReconcilePlan {
  readonly operations: readonly string[];
}

export interface ReconcileStrategy {
  readonly fromVersion: string;
  readonly toVersion: string;
  plan(currentManifest: DeploymentManifest): ReconcilePlan;
}
