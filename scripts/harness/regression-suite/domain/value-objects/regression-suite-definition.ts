// @layer domain
import type { SuiteId } from './suite-id.js';
import type { KRequirementTest } from './k-requirement-test.js';
import type { GngConditionTest } from './gng-condition-test.js';
import type { AgentIndependenceTest } from './agent-independence-test.js';

export type TestCase = KRequirementTest | GngConditionTest | AgentIndependenceTest;

export interface RegressionSuiteDefinitionProps {
  suiteId: SuiteId;
  testCases: TestCase[];
  description: string;
}

export class RegressionSuiteDefinition {
  readonly suiteId: SuiteId;
  readonly testCases: ReadonlyArray<TestCase>;
  readonly description: string;

  private constructor(props: RegressionSuiteDefinitionProps) {
    this.suiteId = props.suiteId;
    this.testCases = Object.freeze([...props.testCases]);
    this.description = props.description;
    Object.freeze(this);
  }

  static create(props: RegressionSuiteDefinitionProps): RegressionSuiteDefinition {
    if (!props.testCases || props.testCases.length === 0) {
      throw new Error('EmptyTestCasesError: testCases must have at least one entry');
    }
    return new RegressionSuiteDefinition(props);
  }

  equals(other: RegressionSuiteDefinition): boolean {
    return (
      this.suiteId.equals(other.suiteId) &&
      this.description === other.description &&
      this.testCases.length === other.testCases.length
    );
  }
}
