/**
 * @layer application
 * @unit harness-error
 *
 * severity契約の格下げ有無を検証するUseCase
 */
import type { SeverityContractCheckInput } from '../dto/severity-contract-check-input.js';
import type { ErrorDefinitionRegistry } from '../../domain/services/error-definition-registry.js';
import type { SeverityContractEnforcer } from '../../domain/services/severity-contract-enforcer.js';
import { ErrorCode } from '../../domain/value-objects/error-code.js';
import { Severity } from '../../domain/value-objects/severity.js';

export interface AssertSeverityContractUseCaseDeps {
  readonly errorDefinitionRegistry: ErrorDefinitionRegistry;
  readonly severityContractEnforcer: SeverityContractEnforcer;
}

export interface AssertSeverityContractOutput {
  readonly code: string;
  readonly effectiveSeverity: 'error' | 'warning';
  readonly violated: false;
}

export class AssertSeverityContractUseCase {
  private readonly errorDefinitionRegistry: ErrorDefinitionRegistry;
  private readonly severityContractEnforcer: SeverityContractEnforcer;

  constructor(deps: AssertSeverityContractUseCaseDeps) {
    this.errorDefinitionRegistry = deps.errorDefinitionRegistry;
    this.severityContractEnforcer = deps.severityContractEnforcer;
  }

  async execute(
    input: SeverityContractCheckInput
  ): Promise<Readonly<AssertSeverityContractOutput>> {
    const errorCode = ErrorCode.create(input.code);
    const requestedSeverity = Severity.create(input.requestedSeverity);
    const definition = this.errorDefinitionRegistry.getDefinition(errorCode);
    const effectiveSeverity =
      this.severityContractEnforcer.resolveEffectiveSeverity(
        requestedSeverity,
        definition.defaultSeverity
      );

    return Object.freeze({
      code: errorCode.toString(),
      effectiveSeverity: effectiveSeverity.toString(),
      violated: false as const,
    });
  }
}
