// @unit validator-system
// @layer domain
// @work-item-id WI-132 / WI-133 / WI-136 / WI-137 / WI-138

import {
  type BoundaryCaseKind,
  type ContractTraceabilityFinding,
  type ContractTraceabilityInput,
  ContractTraceabilityReport,
  type ErrorContract,
  type PublicContract,
  type StateMachineModel,
  type TestObservation,
  type TraceabilityGraphSlice,
} from '../value-objects/contract-traceability-model.js';

export class ContractTraceabilityCoverageService {
  check(input: ContractTraceabilityInput): ContractTraceabilityReport {
    return ContractTraceabilityReport.create([
      ...this.checkPublicContracts(input.publicContracts, input.testObservations),
      ...this.checkErrorContracts(input.errorContracts, input.testObservations),
      ...this.checkStateMachines(input.stateMachines, input.testObservations),
      ...this.checkTraceability(input.traceabilitySlices),
    ]);
  }

  private checkPublicContracts(
    contracts: readonly PublicContract[],
    observations: readonly TestObservation[],
  ): readonly ContractTraceabilityFinding[] {
    const findings: ContractTraceabilityFinding[] = [];
    for (const contract of contracts) {
      for (const behavior of contract.requiredBehaviors) {
        if (!this.isCovered(`${contract.id}:${behavior}`, observations)) {
          findings.push(this.finding(
            'missing-required-behavior-test',
            contract.id,
            contract.sourcePath,
            `Public contract ${contract.id} requires behavior "${behavior}" but no matching test observation covers it.`,
            `Add a test observation covering ${contract.id}:${behavior}.`,
          ));
        }
      }

      if (contract.kind === 'port' && !observations.some((observation) => (
        observation.kind === 'adapter-contract' && observation.covers.includes(contract.id)
      ))) {
        findings.push(this.finding(
          'missing-port-contract-test',
          contract.id,
          contract.sourcePath,
          `Port contract ${contract.id} has no adapter contract test observation.`,
          `Add an adapter contract test that covers ${contract.id}.`,
        ));
      }

      for (const boundaryCase of contract.boundaryCases ?? []) {
        if (!this.isBoundaryCovered(contract, boundaryCase, observations)) {
          findings.push(this.finding(
            'missing-boundary-test',
            contract.id,
            contract.sourcePath,
            `Contract ${contract.id} requires boundary case "${boundaryCase}" but no matching test observation covers it.`,
            `Add a boundary test observation covering ${contract.id}:boundary:${boundaryCase}.`,
          ));
        }
      }
    }
    return findings;
  }

  private checkErrorContracts(
    contracts: readonly ErrorContract[],
    observations: readonly TestObservation[],
  ): readonly ContractTraceabilityFinding[] {
    const findings: ContractTraceabilityFinding[] = [];
    for (const contract of contracts) {
      const missingShapeFields = [
        ['code', contract.code],
        ['severity', contract.severity],
        ['message', contract.message],
        ['suggestion', contract.suggestion],
        ['documentationRef', contract.documentationRef],
      ].filter(([, value]) => !this.hasUsefulText(value));

      if (missingShapeFields.length > 0) {
        findings.push(this.finding(
          'error-contract-shape',
          contract.id,
          contract.sourcePath,
          `Error contract ${contract.id} is missing required fields: ${missingShapeFields.map(([field]) => field).join(', ')}.`,
          'Provide stable code, severity, message, suggestion, and documentation reference.',
        ));
      }

      if (this.isGenericSuggestion(contract.suggestion)) {
        findings.push(this.finding(
          'error-contract-shape',
          contract.id,
          contract.sourcePath,
          `Error contract ${contract.id} has a generic or empty recovery suggestion.`,
          'Replace the suggestion with a concrete next action.',
        ));
      }

      if (contract.exitCode !== undefined && contract.severity !== undefined) {
        const expected = contract.severity === 'error' ? [1, 2] : [0];
        if (!expected.includes(contract.exitCode)) {
          findings.push(this.finding(
            'error-contract-exit-code',
            contract.id,
            contract.sourcePath,
            `Error contract ${contract.id} severity=${contract.severity} is inconsistent with exitCode=${contract.exitCode}.`,
            'Align warning contracts with exit 0 and error contracts with exit 1 or 2.',
          ));
        }
      }

      if (!this.isCovered(`${contract.id}:error-path`, observations)) {
        findings.push(this.finding(
          'missing-error-path-test',
          contract.id,
          contract.sourcePath,
          `Error contract ${contract.id} has no error path test observation.`,
          `Add a test observation covering ${contract.id}:error-path.`,
        ));
      }
    }
    return findings;
  }

  private checkStateMachines(
    machines: readonly StateMachineModel[],
    observations: readonly TestObservation[],
  ): readonly ContractTraceabilityFinding[] {
    const findings: ContractTraceabilityFinding[] = [];
    for (const machine of machines) {
      const codeStates = new Set(machine.codeStates);
      const docsStates = new Set(machine.docsStates);
      const mismatchedStates = [
        ...machine.docsStates.filter((state) => !codeStates.has(state)),
        ...machine.codeStates.filter((state) => !docsStates.has(state)),
      ];
      if (mismatchedStates.length > 0) {
        findings.push(this.finding(
          'state-doc-code-mismatch',
          machine.id,
          machine.sourcePath,
          `State machine ${machine.id} has docs/code state mismatch: ${mismatchedStates.join(', ')}.`,
          'Update docs and code state definitions so they describe the same states.',
        ));
      }

      for (const transition of machine.invalidTransitions) {
        if (machine.terminalStates.includes(transition.from)) {
          findings.push(this.finding(
            'state-invalid-terminal-transition',
            machine.id,
            machine.sourcePath,
            `State machine ${machine.id} defines invalid transition from terminal state ${transition.from} to ${transition.to}.`,
            'Remove terminal-state outgoing transitions or mark them as rejected behavior.',
          ));
        }
      }

      for (const transition of machine.transitions) {
        const key = `${machine.id}:transition:${transition.from}->${transition.to}`;
        if (!this.isCovered(key, observations)) {
          findings.push(this.finding(
            'missing-transition-test',
            machine.id,
            machine.sourcePath,
            `State transition ${transition.from}->${transition.to} has no success/failure test observation.`,
            `Add a test observation covering ${key}.`,
          ));
        }
      }
    }
    return findings;
  }

  private checkTraceability(slices: readonly TraceabilityGraphSlice[]): readonly ContractTraceabilityFinding[] {
    const findings: ContractTraceabilityFinding[] = [];
    for (const slice of slices) {
      const productUnits = new Set(slice.productUnits);
      const missingUnits = slice.affectedUnits.filter((unit) => !productUnits.has(unit));
      if (missingUnits.length > 0) {
        findings.push(this.finding(
          'traceability-unit-mismatch',
          slice.workItemId,
          slice.workItemId,
          `${slice.workItemId} affects units without product reflection: ${missingUnits.join(', ')}.`,
          `Reflect @work-item-id ${slice.workItemId} in product docs for each affected unit.`,
        ));
      }

      if (slice.implementationWorkItemIds.includes(slice.workItemId) && !slice.testWorkItemIds.includes(slice.workItemId)) {
        findings.push(this.finding(
          'traceability-test-mismatch',
          slice.workItemId,
          slice.workItemId,
          `${slice.workItemId} has implementation evidence but no matching test observation.`,
          `Add tests annotated with @work-item-id ${slice.workItemId}.`,
        ));
      }

      if (slice.publicDocsChanged !== slice.contractChanged) {
        findings.push(this.finding(
          'public-doc-contract-sync',
          slice.workItemId,
          slice.workItemId,
          `${slice.workItemId} public docs and public contract changes are not synchronized.`,
          'Update public docs and contract declarations in the same WI, or document why only one changed.',
        ));
      }
    }
    return findings;
  }

  private isBoundaryCovered(
    contract: PublicContract,
    boundaryCase: BoundaryCaseKind,
    observations: readonly TestObservation[],
  ): boolean {
    return this.isCovered(`${contract.id}:boundary:${boundaryCase}`, observations)
      || this.isCovered(`${contract.id}:${boundaryCase}`, observations);
  }

  private isCovered(requiredKey: string, observations: readonly TestObservation[]): boolean {
    return observations.some((observation) => observation.covers.includes(requiredKey));
  }

  private hasUsefulText(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isGenericSuggestion(value: unknown): boolean {
    if (!this.hasUsefulText(value)) return true;
    const normalized = String(value).trim().toLowerCase();
    return ['fix it', 'check the error', 'see logs', 'unknown'].includes(normalized);
  }

  private finding(
    kind: ContractTraceabilityFinding['kind'],
    subject: string,
    sourcePath: string,
    message: string,
    suggestion: string,
  ): ContractTraceabilityFinding {
    return {
      kind,
      severity: 'error',
      subject,
      sourcePath,
      message,
      suggestion,
    };
  }
}
