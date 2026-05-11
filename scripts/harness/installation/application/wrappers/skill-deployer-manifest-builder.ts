// @unit installation
// @layer application
// @work-item-id WI-145

import { DeploymentEntry } from "../../domain/deployment-entry.js";
import { DeploymentManifest } from "../../domain/deployment-manifest.js";
import type { HashCalculatorPort } from "../ports/hash-calculator-port.js";

export interface DeployManifestRecord {
  readonly path: string;
  readonly mode: "created" | "merged" | "symlink";
  readonly contentForHash: string;
  readonly block?: {
    readonly start: string;
    readonly end: string;
    readonly content: string;
  } | null;
}

export class SkillDeployerManifestBuilder {
  constructor(private readonly hashCalculator: HashCalculatorPort) {}

  build(version: string, records: readonly DeployManifestRecord[], deployedAt = new Date().toISOString()): DeploymentManifest {
    let manifest = DeploymentManifest.create(version, deployedAt);
    for (const record of records) {
      manifest = manifest.addEntry(
        DeploymentEntry.create({
          path: record.path,
          mode: record.mode,
          block: record.block ?? null,
          hash: this.hashCalculator.compute(record.contentForHash),
          deployedAt,
        }),
      );
    }
    return manifest;
  }
}
