// @unit installation
// @layer domain
// @work-item-id WI-145
// @work-item-id WI-326

import { DeploymentEntry, type DeploymentEntryJson } from "./deployment-entry.js";

// Records which install-time options produced this manifest so a later
// reconcile can honor the original opt-in state instead of assuming defaults.
// Optional for backward compatibility: manifests written before WI-326 carry
// no flags, and consumers must fall back to legacy behavior in that case.
export interface InstallationFlags {
  readonly includeHusky: boolean;
  readonly includeCi: boolean;
  readonly personal: boolean;
}

export interface DeploymentManifestInput {
  readonly version: string;
  readonly installedAt: string;
  readonly entries: readonly DeploymentEntry[];
  readonly installationFlags?: InstallationFlags;
}

export interface DeploymentManifestJson {
  readonly version: string;
  readonly installedAt: string;
  readonly entries: readonly DeploymentEntryJson[];
  readonly installationFlags?: InstallationFlags;
}

export class DeploymentManifest {
  private static readonly SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

  readonly version: string;
  readonly installedAt: string;
  readonly entries: readonly DeploymentEntry[];
  readonly installationFlags?: InstallationFlags;

  private constructor(input: DeploymentManifestInput) {
    if (!DeploymentManifest.SEMVER_PATTERN.test(input.version)) {
      throw new Error("DeploymentManifest version must be semver");
    }
    if (!Number.isFinite(Date.parse(input.installedAt))) {
      throw new Error("DeploymentManifest installedAt must be ISO8601-compatible");
    }
    if (input.installationFlags !== undefined) {
      const { includeHusky, includeCi, personal } = input.installationFlags;
      if (typeof includeHusky !== "boolean" || typeof includeCi !== "boolean" || typeof personal !== "boolean") {
        throw new Error("DeploymentManifest installationFlags must contain boolean includeHusky/includeCi/personal");
      }
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
    this.installationFlags =
      input.installationFlags === undefined
        ? undefined
        : Object.freeze({
            includeHusky: input.installationFlags.includeHusky,
            includeCi: input.installationFlags.includeCi,
            personal: input.installationFlags.personal,
          });
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
      installationFlags: input.installationFlags,
    });
  }

  addEntry(entry: DeploymentEntry): DeploymentManifest {
    const entries = this.entries.filter((current) => current.path !== entry.path);
    return DeploymentManifest.reconstitute({
      version: this.version,
      installedAt: this.installedAt,
      entries: [...entries, entry],
      installationFlags: this.installationFlags,
    });
  }

  removeEntry(path: string): DeploymentManifest {
    return DeploymentManifest.reconstitute({
      version: this.version,
      installedAt: this.installedAt,
      entries: this.entries.filter((entry) => entry.path !== path),
      installationFlags: this.installationFlags,
    });
  }

  withInstallationFlags(installationFlags: InstallationFlags): DeploymentManifest {
    return DeploymentManifest.reconstitute({
      version: this.version,
      installedAt: this.installedAt,
      entries: this.entries,
      installationFlags,
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
      // Omit the key entirely for legacy manifests so serialized output stays
      // byte-compatible with pre-WI-326 manifest.json files.
      ...(this.installationFlags === undefined ? {} : { installationFlags: this.installationFlags }),
    };
  }
}
