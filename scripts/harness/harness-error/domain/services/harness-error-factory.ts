/**
 * @layer domain
 * @unit harness-error
 *
 * HarnessErrorFactory ドメインサービス
 * ErrorDefinitionRegistry と Domain ポートを組み合わせて HarnessError を生成する唯一の入口
 */
import { AdrReferenceNotFoundError } from "../errors/adr-reference-not-found-error.js";
import { EmptyMessageError } from "../errors/empty-message-error.js";
import { EmptySuggestionError } from "../errors/empty-suggestion-error.js";
import { InvalidFixExampleError } from "../errors/invalid-fix-example-error.js";
import { MissingAdrRefError } from "../errors/missing-adr-ref-error.js";
import { MissingFixExampleError } from "../errors/missing-fix-example-error.js";
import type { AdrExistenceCheckerPort } from "../ports/adr-existence-checker-port.js";
import type { FixExampleValidatorPort } from "../ports/fix-example-validator-port.js";
import { AdrRef } from "../value-objects/adr-ref.js";
import { ErrorCode } from "../value-objects/error-code.js";
import { FixExample } from "../value-objects/fix-example.js";
import { HarnessError } from "../value-objects/harness-error.js";
import type { RemediationType } from "../value-objects/remediation-type.js";
import { Severity } from "../value-objects/severity.js";
import type { ErrorDefinitionRegistry } from "./error-definition-registry.js";
import type { SeverityContractEnforcer } from "./severity-contract-enforcer.js";

export interface CreateHarnessErrorParams {
  readonly code: string;
  readonly message: string;
  readonly suggestion: string;
  readonly validatorId: string;
  readonly requestedSeverity?: "error" | "warning";
  readonly adrRef?: string | null;
  readonly fixExample?: string | null;
  readonly suggestedSkill?: string | null;
  readonly scaffoldCommand?: string | null;
  readonly templatePath?: string | null;
  /** WI-335: suggestion の修復方式分類。省略時は ErrorDefinition の既定に従う。 */
  readonly remediationType?: RemediationType | null;
}

export interface HarnessErrorFactoryDeps {
  readonly registry: ErrorDefinitionRegistry;
  readonly severityContractEnforcer: SeverityContractEnforcer;
  readonly adrExistenceCheckerPort: AdrExistenceCheckerPort;
  readonly fixExampleValidatorPort: FixExampleValidatorPort;
}

export class HarnessErrorFactory {
  private readonly registry: ErrorDefinitionRegistry;
  private readonly severityContractEnforcer: SeverityContractEnforcer;
  private readonly adrExistenceCheckerPort: AdrExistenceCheckerPort;
  private readonly fixExampleValidatorPort: FixExampleValidatorPort;

  constructor(deps: HarnessErrorFactoryDeps) {
    this.registry = deps.registry;
    this.severityContractEnforcer = deps.severityContractEnforcer;
    this.adrExistenceCheckerPort = deps.adrExistenceCheckerPort;
    this.fixExampleValidatorPort = deps.fixExampleValidatorPort;
  }

  async create(input: CreateHarnessErrorParams): Promise<HarnessError> {
    // 1. message / suggestion の空文字検証
    if (!input.message || input.message.trim().length === 0) {
      throw new EmptyMessageError();
    }
    if (!input.suggestion || input.suggestion.trim().length === 0) {
      throw new EmptySuggestionError();
    }

    // 2. ErrorCode の VO 化と定義取得
    const errorCode = ErrorCode.create(input.code);
    const definition = this.registry.getDefinition(errorCode);

    // 3. severity 解決
    const requestedSeverity = input.requestedSeverity ? Severity.create(input.requestedSeverity) : undefined;
    const effectiveSeverity = this.severityContractEnforcer.resolveEffectiveSeverity(
      requestedSeverity,
      definition.defaultSeverity,
    );

    // 4. ADR 解決
    const explicitAdrRef = input.adrRef != null ? AdrRef.create(input.adrRef) : undefined;
    const resolvedAdrRef = definition.resolveAdrRef(explicitAdrRef);

    // 5. ADR 必須チェック
    if (definition.requiresAdrRef() && resolvedAdrRef === null) {
      throw new MissingAdrRefError(errorCode.toString());
    }

    // 6. ADR 実在確認
    if (resolvedAdrRef !== null) {
      const exists = await this.adrExistenceCheckerPort.exists(resolvedAdrRef);
      if (!exists) {
        throw new AdrReferenceNotFoundError(resolvedAdrRef.toString());
      }
    }

    // 7. fix_example 解決
    const explicitFixExample = input.fixExample != null ? FixExample.create(input.fixExample) : undefined;
    const resolvedFixExample = definition.resolveFixExample(explicitFixExample);

    // 8. fix_example 必須チェック
    if (definition.requiresFixExample() && resolvedFixExample === null) {
      throw new MissingFixExampleError(errorCode.toString());
    }

    // 9. fix_example 検証
    if (resolvedFixExample !== null) {
      const validationResult = await this.fixExampleValidatorPort.validate({
        validatorId: input.validatorId,
        errorCode,
        fixExample: resolvedFixExample,
      });
      if (!validationResult.passed) {
        throw new InvalidFixExampleError(
          `fix_example の検証に失敗しました (code=${errorCode.toString()}): ${validationResult.reason}`,
        );
      }
    }

    // 10. actionable フィールドの解決（ErrorDefinition の default と input 引数の合成）
    const resolvedSuggestedSkill = definition.resolveSuggestedSkill(input.suggestedSkill);
    const resolvedScaffoldCommand = definition.resolveScaffoldCommand(input.scaffoldCommand);
    const resolvedTemplatePath = definition.resolveTemplatePath(input.templatePath);
    const resolvedRemediationType = definition.resolveRemediationType(input.remediationType);

    // 11. HarnessError 生成と凍結
    const harnessError = new HarnessError({
      code: errorCode,
      severity: effectiveSeverity,
      message: input.message,
      suggestion: input.suggestion,
      adrRef: resolvedAdrRef,
      fixExample: resolvedFixExample,
      suggestedSkill: resolvedSuggestedSkill,
      scaffoldCommand: resolvedScaffoldCommand,
      templatePath: resolvedTemplatePath,
      remediationType: resolvedRemediationType,
    });

    return Object.freeze(harnessError);
  }
}
