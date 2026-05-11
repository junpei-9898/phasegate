// @unit installation
// @layer domain
// @work-item-id WI-145

import { DeploymentEntry, type DeploymentEntryJson } from "./deployment-entry.js";

export interface DeploymentManifestInput {
  readonly version: string;
  readonly installedAt: string;
  readonly entries: readonly DeploymentEntry[];
}

export interface DeploymentManifestJson {
  readonly version: string;
  readonly installedAt: string;
  readonly entries: readonly DeploymentEntryJson[];
}

export class DeploymentManifest {
  private static readonly SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

  readonly version: string;
  readonly installedAt: string;
  readonly entries: readonly DeploymentEntry[];

  private constructor(input: DeploymentManifestInput) {
    if (!DeploymentManifest.SEMVER_PATTERN.test(input.version)) {
      throw new Error("DeploymentManifest version must be semver");
    }
    if (!Number.isFinite(Date.parse(input.installedAt))) {
      throw new Error("DeploymentManifest installedAt must be ISO8601-compatible");
    }
    const paths = new Set<string>();
    for (const entry of input.entries) {
      if (paths.has(entry.path)) {
        throw new Error(`DeploymentManifest contains duplicate entry path: ${entry.path}`);
      }
      paths.add(entry.path);
    }
    this.version = input.version;
    this.installedAt = input.installedAt;
    this.entries = Object.freeze([...input.entries]);
    Object.freeze(this);
  }

  static create(version: string, installedAt = new Date().toISOString()): DeploymentManifest {
    return new DeploymentManifest({ version, installedAt, entries: [] });
  }

  static reconstitute(input: DeploymentManifestInput): DeploymentManifest {
    return new DeploymentManifest(input);
  }

  static fromJSON(input: DeploymentManifestJson): DeploymentManifest {
    return DeploymentManifest.reconstitute({
      version: input.version,
      installedAt: input.installedAt,
      entries: input.entries.map((entry) => DeploymentEntry.fromJSON(entry)),
    });
  }

  addEntry(entry: DeploymentEntry): DeploymentManifest {
    const entries = this.entries.filter((current) => current.path !== entry.path);
    return DeploymentManifest.reconstitute({
      version: this.version,
      installedAt: this.installedAt,
      entries: [...entries, entry],
    });
  }

  removeEntry(path: string): DeploymentManifest {
    return DeploymentManifest.reconstitute({
      version: this.version,
      installedAt: this.installedAt,
      entries: this.entries.filter((entry) => entry.path !== path),
    });
  }

  findEntry(path: string): DeploymentEntry | null {
    return this.entries.find((entry) => entry.path === path) ?? null;
  }

  toJSON(): DeploymentManifestJson {
    return {
      version: this.version,
      installedAt: this.installedAt,
      entries: this.entries.map((entry) => entry.toJSON()),
    };
  }
}
