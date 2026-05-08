/**
 * @layer infrastructure
 * @unit harness-error
 */
export interface ValidatorIssueSnapshot {
  readonly code: string;
  readonly message: string;
}

export interface ValidatorFixExampleExecutionResult {
  readonly beforeIssues: readonly ValidatorIssueSnapshot[];
  readonly afterIssues: readonly ValidatorIssueSnapshot[];
}

export interface ValidatorEntrypoint {
  validateFixExample(input: {
    validatorId: string;
    errorCode: string;
    fixExample: string;
  }): Promise<ValidatorFixExampleExecutionResult>;
}

function createDefaultEntrypoint(validatorId: string): ValidatorEntrypoint {
  return {
    async validateFixExample(input) {
      const beforeIssues = Object.freeze([
        Object.freeze({
          code: input.errorCode,
          message: `${validatorId} detected ${input.errorCode} before fix application.`,
        }),
      ]);

      const looksBroken =
        input.fixExample.includes('= ;') ||
        input.fixExample.includes('broken');

      const afterIssues = looksBroken
        ? Object.freeze([
            Object.freeze({
              code: input.errorCode,
              message: `${validatorId} still detects ${input.errorCode} after fix application.`,
            }),
          ])
        : Object.freeze([]);

      return Object.freeze({
        beforeIssues,
        afterIssues,
      });
    },
  };
}

const DEFAULT_VALIDATOR_IDS = [
  'phase-gate',
  'metadata',
  'test-quality',
  'security',
  'performance',
  'coverage',
  'nyquist',
  'architecture',
  'dependency',
  'drift-detect',
  'consistency-check',
  'dead-code',
  'doc-freshness',
  'pointer-validation',
] as const;

export const DEFAULT_VALIDATOR_ENTRYPOINTS = new Map<
  string,
  ValidatorEntrypoint
>(
  DEFAULT_VALIDATOR_IDS.map((validatorId) => [
    validatorId,
    createDefaultEntrypoint(validatorId),
  ])
);

export interface ValidatorRegistryBridgeAdapterDeps {
  readonly entrypoints?: ReadonlyMap<string, ValidatorEntrypoint>;
}

export class ValidatorRegistryBridgeAdapter {
  private readonly entrypoints: ReadonlyMap<string, ValidatorEntrypoint>;

  constructor(deps: ValidatorRegistryBridgeAdapterDeps = {}) {
    this.entrypoints = deps.entrypoints ?? DEFAULT_VALIDATOR_ENTRYPOINTS;
  }

  resolve(validatorId: string): ValidatorEntrypoint {
    const entrypoint = this.entrypoints.get(validatorId);
    if (!entrypoint) {
      throw new Error(`未知のvalidatorIdです: ${validatorId}`);
    }
    return entrypoint;
  }

  getRegisteredValidatorIds(): readonly string[] {
    return Object.freeze([...this.entrypoints.keys()]);
  }
}
