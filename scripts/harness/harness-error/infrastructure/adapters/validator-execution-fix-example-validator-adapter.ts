/**
 * @layer infrastructure
 * @unit harness-error
 */
import type { FixExampleValidatorPort } from '../../domain/ports/fix-example-validator-port.js';
import { FixExampleValidationResult } from '../../domain/value-objects/fix-example-validation-result.js';
import type {
  ValidatorEntrypoint,
  ValidatorIssueSnapshot,
} from './validator-registry-bridge-adapter.js';
import { ValidatorRegistryBridgeAdapter } from './validator-registry-bridge-adapter.js';
import { TypeScriptSnippetSyntaxAdapter } from './type-script-snippet-syntax-adapter.js';

export type { ValidatorEntrypoint } from './validator-registry-bridge-adapter.js';

export interface ValidatorExecutionFixExampleValidatorAdapterDeps {
  readonly syntaxAdapter: TypeScriptSnippetSyntaxAdapter;
  readonly validatorRegistryBridge: ValidatorRegistryBridgeAdapter;
}

export class ValidatorExecutionFixExampleValidatorAdapter
  implements FixExampleValidatorPort
{
  private readonly syntaxAdapter: TypeScriptSnippetSyntaxAdapter;
  private readonly validatorRegistryBridge: ValidatorRegistryBridgeAdapter;

  constructor(deps: ValidatorExecutionFixExampleValidatorAdapterDeps) {
    this.syntaxAdapter = deps.syntaxAdapter;
    this.validatorRegistryBridge = deps.validatorRegistryBridge;
  }

  async validate(input: {
    validatorId: string;
    errorCode: { toString(): string };
    fixExample: { toString(): string };
  }): Promise<FixExampleValidationResult> {
    const syntaxResult = this.syntaxAdapter.validate(input.fixExample.toString());
    const entrypoint = this.validatorRegistryBridge.resolve(input.validatorId);
    const validatorResult = await entrypoint.validateFixExample({
      validatorId: input.validatorId,
      errorCode: input.errorCode.toString(),
      fixExample: input.fixExample.toString(),
    });

    const diagnostics = [
      ...this.buildSyntaxDiagnostics(syntaxResult.diagnostics),
      ...this.buildFixtureDiagnostics(
        input.errorCode.toString(),
        validatorResult.beforeIssues
      ),
      ...this.buildValidatorDiagnostics(
        input.errorCode.toString(),
        validatorResult.afterIssues
      ),
    ];

    const targetIssueDetectedBefore = validatorResult.beforeIssues.some(
      (issue) => issue.code === input.errorCode.toString()
    );
    const targetIssueRemains = validatorResult.afterIssues.some(
      (issue) => issue.code === input.errorCode.toString()
    );
    const additionalIssues = validatorResult.afterIssues.some(
      (issue) => issue.code !== input.errorCode.toString()
    );

    if (
      syntaxResult.valid &&
      targetIssueDetectedBefore &&
      !targetIssueRemains &&
      !additionalIssues
    ) {
      return FixExampleValidationResult.success(input.validatorId);
    }

    const reason = this.resolveFailureReason(
      syntaxResult.valid,
      targetIssueDetectedBefore,
      targetIssueRemains,
      additionalIssues
    );

    return FixExampleValidationResult.failure(
      input.validatorId,
      reason,
      diagnostics
    );
  }

  private buildSyntaxDiagnostics(
    diagnostics: readonly string[]
  ): readonly string[] {
    return diagnostics.map((diagnostic) => `構文エラー: ${diagnostic}`);
  }

  private buildFixtureDiagnostics(
    targetCode: string,
    issues: readonly ValidatorIssueSnapshot[]
  ): readonly string[] {
    const found = issues.some((issue) => issue.code === targetCode);
    if (found) {
      return [];
    }
    return [`fixture不足: ${targetCode} を再現できませんでした。`];
  }

  private buildValidatorDiagnostics(
    targetCode: string,
    issues: readonly ValidatorIssueSnapshot[]
  ): readonly string[] {
    return issues.map((issue) =>
      issue.code === targetCode
        ? `validator失敗: ${issue.message}`
        : `追加検出: ${issue.code} ${issue.message}`
    );
  }

  private resolveFailureReason(
    syntaxValid: boolean,
    targetIssueDetectedBefore: boolean,
    targetIssueRemains: boolean,
    additionalIssues: boolean
  ): string {
    if (!targetIssueDetectedBefore) {
      return 'fixture上で対象コードの違反を再現できませんでした。';
    }
    if (!syntaxValid && targetIssueRemains) {
      return '構文エラーがあり、対象コードの違反も残っています。';
    }
    if (!syntaxValid) {
      return '構文エラーが存在します。';
    }
    if (targetIssueRemains) {
      return 'fix_example適用後も対象コードの違反が残っています。';
    }
    if (additionalIssues) {
      return 'fix_example適用後に別コードの違反が追加されています。';
    }
    return 'fix_exampleの検証に失敗しました。';
  }
}
