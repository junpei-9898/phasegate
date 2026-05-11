// @unit installation
// @layer domain
// @work-item-id WI-145

import { Hash } from "./hash.js";
import { ManagedBlock, type ManagedBlockInput } from "./managed-block.js";

export type DeploymentEntryMode = "created" | "merged" | "symlink";

export interface DeploymentEntryInput {
  readonly path: string;
  readonly mode: DeploymentEntryMode;
  readonly block: ManagedBlock | ManagedBlockInput | null;
  readonly hash: Hash | string;
  readonly deployedAt: string;
}

export interface DeploymentEntryJson {
  readonly path: string;
  readonly mode: DeploymentEntryMode;
  readonly block?: ManagedBlockInput | null;
  readonly hash: string;
  readonly deployedAt: string;
}

export class DeploymentEntry {
  readonly path: string;
  readonly mode: DeploymentEntryMode;
  readonly block: ManagedBlock | null;
  readonly hash: Hash;
  readonly deployedAt: string;

  private constructor(input: DeploymentEntryInput) {
    if (input.path.trim().length === 0 || input.path.startsWith("/")) {
      throw new Error("DeploymentEntry path must be a project-relative path");
    }
    if (!Number.isFinite(Date.parse(input.deployedAt))) {
      throw new Error("DeploymentEntry deployedAt must be ISO8601-compatible");
    }
    const block = input.block instanceof ManagedBlock
      ? input.block
      : input.block === null
        ? null
        : ManagedBlock.create(input.block);
    if (input.mode === "merged" && block === null) {
      throw new Error("DeploymentEntry with mode merged requires a managed block");
    }
    if (input.mode !== "merged" && block !== null) {
      throw new Error("DeploymentEntry block is only allowed for merged mode");
    }
    this.path = input.path;
    this.mode = input.mode;
    this.block = block;
    this.hash = input.hash instanceof Hash ? input.hash : Hash.from(input.hash);
    this.deployedAt = input.deployedAt;
    Object.freeze(this);
  }

  static create(input: DeploymentEntryInput): DeploymentEntry {
    return new DeploymentEntry(input);
  }

  static fromJSON(input: DeploymentEntryJson): DeploymentEntry {
    return DeploymentEntry.create({
      path: input.path,
      mode: input.mode,
      block: input.block ?? null,
      hash: input.hash,
      deployedAt: input.deployedAt,
    });
  }

  equals(other: DeploymentEntry): boolean {
    return this.path === other.path;
  }

  toJSON(): DeploymentEntryJson {
    return {
      path: this.path,
      mode: this.mode,
      block: this.block?.toJSON() ?? null,
      hash: this.hash.toString(),
      deployedAt: this.deployedAt,
    };
  }
}
