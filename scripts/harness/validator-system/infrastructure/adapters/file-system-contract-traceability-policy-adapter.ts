// @unit validator-system
// @layer infrastructure
// @work-item-id WI-132 / WI-133 / WI-136 / WI-137 / WI-138

import { readFile } from 'node:fs/promises';
import type { ContractTraceabilityPolicyPort } from '../../domain/ports/contract-traceability-policy-port.js';
import type {
  BoundaryCaseKind,
  ContractTraceabilityInput,
  PublicContract,
  PublicContractKind,
  TestObservation,
} from '../../domain/value-objects/contract-traceability-model.js';

const CONTRACT_KINDS = new Set<PublicContractKind>([
  'cli-command',
  'api-endpoint',
  'port',
  'config-option',
  'domain-behavior',
  'error-code',
]);

const BOUNDARY_KINDS = new Set<BoundaryCaseKind>([
  'empty-input',
  'missing-required',
  'invalid-enum',
  'duplicate-id',
  'unknown-reference',
  'permission-denied',
  'config-disabled',
  'partial-failure',
  'idempotency',
  'backward-compatibility',
]);

export class FileSystemContractTraceabilityPolicyAdapter implements ContractTraceabilityPolicyPort {
  async collect(targetPaths: readonly string[]): Promise<ContractTraceabilityInput> {
    const publicContracts: PublicContract[] = [];
    const testObservations: TestObservation[] = [];

    for (const targetPath of targetPaths) {
      let content: string;
      try {
        content = await readFile(targetPath, 'utf-8');
      } catch {
        continue;
      }

      publicContracts.push(...this.extractContracts(targetPath, content));
      testObservations.push(...this.extractObservations(targetPath, content));
    }

    return {
      publicContracts,
      testObservations,
      errorContracts: [],
      stateMachines: [],
      traceabilitySlices: [],
    };
  }

  private extractContracts(sourcePath: string, content: string): readonly PublicContract[] {
    return [...content.matchAll(/@phasegate-contract\s+([^\n\r*]+)/g)].flatMap((match) => {
      const attrs = this.parseAttrs(match[1]);
      const id = attrs.get('id');
      const kind = attrs.get('kind');
      if (!id || !this.isContractKind(kind)) return [];

      return [{
        id,
        kind,
        sourcePath,
        requiredBehaviors: this.splitList(attrs.get('behaviors')),
        boundaryCases: this.splitList(attrs.get('boundary')).filter(this.isBoundaryKind),
      }];
    });
  }

  private extractObservations(sourcePath: string, content: string): readonly TestObservation[] {
    return [...content.matchAll(/@phasegate-observation\s+([^\n\r*]+)/g)].flatMap((match, index) => {
      const attrs = this.parseAttrs(match[1]);
      const covers = this.splitList(attrs.get('covers'));
      if (covers.length === 0) return [];
      const kind = attrs.get('kind');
      return [{
        id: attrs.get('id') ?? `${sourcePath}#observation-${index + 1}`,
        kind: kind === 'adapter-contract' || kind === 'integration' || kind === 'e2e' ? kind : 'unit',
        sourcePath,
        covers,
      }];
    });
  }

  private parseAttrs(raw: string): Map<string, string> {
    const attrs = new Map<string, string>();
    for (const match of raw.matchAll(/([a-zA-Z][a-zA-Z0-9_-]*)=("[^"]*"|'[^']*'|[^\s]+)/g)) {
      attrs.set(match[1], match[2].replace(/^['"]|['"]$/g, ''));
    }
    return attrs;
  }

  private splitList(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map((value) => value.trim()).filter((value) => value.length > 0);
  }

  private isContractKind(value: string | undefined): value is PublicContractKind {
    return value !== undefined && CONTRACT_KINDS.has(value as PublicContractKind);
  }

  private isBoundaryKind(value: string): value is BoundaryCaseKind {
    return BOUNDARY_KINDS.has(value as BoundaryCaseKind);
  }
}
