/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { Artifact } from './artifact.js';
import { PhaseLevel } from './phase-level.js';

export interface PhaseNodeCreateArgs {
  readonly skillName: string;
  readonly level: PhaseLevel;
  readonly artifacts: readonly Artifact[];
}

export class PhaseNode {
  readonly skillName: string;
  readonly level: PhaseLevel;
  readonly artifacts: readonly Artifact[];

  private constructor(args: PhaseNodeCreateArgs) {
    this.skillName = args.skillName.trim();
    this.level = args.level;
    this.artifacts = Object.freeze([...args.artifacts]);
    Object.freeze(this);
  }

  static create(args: PhaseNodeCreateArgs): PhaseNode {
    const skillName = args.skillName.trim();

    if (skillName.length === 0) {
      throw new Error('PhaseNode.skillNameは空文字を許可しません');
    }

    if (
      args.level.value === 3 &&
      args.artifacts.length > 0 &&
      args.artifacts.some((artifact) => !artifact.path.includes('{storyId}'))
    ) {
      throw new Error('Level 3のArtifactには{storyId}が必要です');
    }

    return new PhaseNode({
      skillName,
      level: args.level,
      artifacts: args.artifacts,
    });
  }

  nodeKey(): string {
    return `${this.level.value}:${this.skillName}`;
  }

  planArtifacts(): readonly Artifact[] {
    return Object.freeze(this.artifacts.filter((artifact) => artifact.isPlanArtifact()));
  }

  requiredArtifacts(): readonly Artifact[] {
    return Object.freeze(this.artifacts.filter((artifact) => artifact.required));
  }

  equals(other: PhaseNode): boolean {
    if (
      this.skillName !== other.skillName ||
      !this.level.equals(other.level) ||
      this.artifacts.length !== other.artifacts.length
    ) {
      return false;
    }

    return this.artifacts.every((artifact, index) => artifact.equals(other.artifacts[index]));
  }
}
