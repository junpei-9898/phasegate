// check-ready-result.ts — CheckReadyResult Value Object

export interface PhaseGateStoryResult {
  storyId: string;
  passed: boolean;
  missingPhases?: string[];
}

export interface CheckReadyResultProps {
  stories: readonly PhaseGateStoryResult[];
  allPassed: boolean;
}

export class CheckReadyResult {
  readonly stories: readonly PhaseGateStoryResult[];
  readonly allPassed: boolean;

  private constructor(stories: readonly PhaseGateStoryResult[], allPassed: boolean) {
    this.stories = Object.freeze([...stories]);
    this.allPassed = allPassed;
    Object.freeze(this);
  }

  static create(props: CheckReadyResultProps): CheckReadyResult {
    const computedAllPassed = props.stories.every((s) => s.passed);
    if (props.allPassed !== computedAllPassed) {
      throw new Error(
        `HarnessApiDomainError: allPassed=${props.allPassed} does not match stories state (computed: ${computedAllPassed})`
      );
    }
    return new CheckReadyResult(props.stories, props.allPassed);
  }

  static fromStories(stories: readonly PhaseGateStoryResult[]): CheckReadyResult {
    const allPassed = stories.every((s) => s.passed);
    return new CheckReadyResult(stories, allPassed);
  }

  getFailedStories(): readonly PhaseGateStoryResult[] {
    return this.stories.filter((s) => !s.passed);
  }
}
