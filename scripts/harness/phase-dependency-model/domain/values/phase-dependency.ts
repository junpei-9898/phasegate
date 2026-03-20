/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { PhaseNode } from './phase-node.js';

export type PhaseDependencyType = 'requires' | 'recommends';

export interface PhaseDependencyCreateArgs {
  readonly from: PhaseNode;
  readonly to: PhaseNode;
  readonly type: PhaseDependencyType;
}

export class InvalidPhaseDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPhaseDependencyError';
  }
}

export class PhaseDependency {
  readonly from: PhaseNode;
  readonly to: PhaseNode;
  readonly type: PhaseDependencyType;

  private constructor(args: PhaseDependencyCreateArgs) {
    this.from = args.from;
    this.to = args.to;
    this.type = args.type;
    Object.freeze(this);
  }

  static create(args: PhaseDependencyCreateArgs): PhaseDependency {
    if (args.from.equals(args.to)) {
      throw new InvalidPhaseDependencyError('自己依存は許可されません');
    }

    if (args.type !== 'requires' && args.type !== 'recommends') {
      throw new InvalidPhaseDependencyError(`依存種別が不正です: ${args.type}`);
    }

    return new PhaseDependency(args);
  }

  isCrossLevel(): boolean {
    return this.from.level.value !== this.to.level.value;
  }

  isLevelTransition(): boolean {
    return this.isCrossLevel() && this.to.level.value - this.from.level.value === 1;
  }

  equals(other: PhaseDependency): boolean {
    return (
      this.from.equals(other.from) &&
      this.to.equals(other.to) &&
      this.type === other.type
    );
  }
}
