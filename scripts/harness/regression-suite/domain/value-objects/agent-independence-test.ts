// @layer domain
export interface AgentIndependenceTestProps {
  targetModule: string;
  forbiddenPatterns: string[];
  allowedPaths: string[];
}

export class AgentIndependenceTest {
  readonly targetModule: string;
  readonly forbiddenPatterns: ReadonlyArray<string>;
  readonly allowedPaths: ReadonlyArray<string>;

  private constructor(props: AgentIndependenceTestProps) {
    this.targetModule = props.targetModule;
    this.forbiddenPatterns = Object.freeze([...props.forbiddenPatterns]);
    this.allowedPaths = Object.freeze([...props.allowedPaths]);
    Object.freeze(this);
  }

  static create(props: AgentIndependenceTestProps): AgentIndependenceTest {
    if (!props.targetModule || props.targetModule.trim().length === 0) {
      throw new Error('InvalidAgentIndependenceTestError: targetModule must not be empty');
    }
    if (!props.forbiddenPatterns || props.forbiddenPatterns.length === 0) {
      throw new Error('EmptyForbiddenPatternsError: forbiddenPatterns must have at least one entry');
    }
    return new AgentIndependenceTest(props);
  }

  equals(other: AgentIndependenceTest): boolean {
    return (
      this.targetModule === other.targetModule &&
      JSON.stringify(this.forbiddenPatterns) === JSON.stringify(other.forbiddenPatterns)
    );
  }
}
