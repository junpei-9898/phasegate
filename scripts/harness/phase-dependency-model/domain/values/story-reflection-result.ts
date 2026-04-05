/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { StoryReflectionMapping } from './story-reflection-mapping.js';

export interface StoryReflectionViolation {
  readonly storyId: string;
  readonly mapping: StoryReflectionMapping;
  readonly inceptionPath: string;
  readonly productPath: string;
}

interface StoryReflectionResultCreateArgs {
  readonly passed: boolean;
  readonly violations: readonly StoryReflectionViolation[];
  readonly warnings: readonly StoryReflectionViolation[];
}

export class StoryReflectionResult {
  readonly passed: boolean;
  readonly violations: readonly StoryReflectionViolation[];
  readonly warnings: readonly StoryReflectionViolation[];

  private constructor(args: StoryReflectionResultCreateArgs) {
    this.passed = args.passed;
    this.violations = Object.freeze([...args.violations]);
    this.warnings = Object.freeze([...args.warnings]);
    Object.freeze(this);
  }

  static pass(): StoryReflectionResult {
    return new StoryReflectionResult({
      passed: true,
      violations: [],
      warnings: [],
    });
  }

  static create(args: {
    violations: readonly StoryReflectionViolation[];
    warnings: readonly StoryReflectionViolation[];
  }): StoryReflectionResult {
    return new StoryReflectionResult({
      passed: args.violations.length === 0,
      violations: args.violations,
      warnings: args.warnings,
    });
  }

  isBlocked(): boolean {
    return this.violations.length > 0;
  }
}
