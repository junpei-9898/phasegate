// @unit world-model
// @layer application
// @work-item-id WI-305

import type { PinnedDesignEndpointDto, PinnedDesignEndpointReadResultDto } from "../dto/pinned-design-endpoint-dto.js";
import type { ConstraintDeclarationRepositoryPort } from "../ports/world-control-declaration-repository-port.js";

const EXPLICIT_FRAGMENT_ID = /^pgw:v1:fragment:(product|inception):(.+)$/;
const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export class PinnedDesignEndpointFacade {
  constructor(private readonly repository: ConstraintDeclarationRepositoryPort) {}

  async read(): Promise<PinnedDesignEndpointReadResultDto> {
    const result = await this.repository.load();
    if (result.state === "invalid") {
      return Object.freeze({
        state: "unavailable",
        diagnosticCodes: Object.freeze([...new Set(result.diagnostics.map((item) => item.code))].sort(compare)),
      });
    }
    if (result.value.malformedDeclarations.length > 0 || result.value.diagnostics.length > 0) {
      return Object.freeze({
        state: "unavailable",
        diagnosticCodes: Object.freeze(
          [
            ...(result.value.malformedDeclarations.length > 0 ? ["malformed-constraint-declaration"] : []),
            ...result.value.diagnostics.map((item) => item.code),
          ].sort(compare),
        ),
      });
    }
    const endpoints: PinnedDesignEndpointDto[] = [];
    for (const record of result.value.records) {
      for (const endpoint of ["claimant", "premise"] as const) {
        const nodeId = record[endpoint].nodeId.toString();
        const match = EXPLICIT_FRAGMENT_ID.exec(nodeId);
        if (!match) continue;
        endpoints.push(
          Object.freeze({
            constraintId: record.constraintId.toString(),
            endpoint,
            nodeId,
            corpusRole: match[1] as "product" | "inception",
            declaredKey: match[2],
          }),
        );
      }
    }
    endpoints.sort(
      (left, right) =>
        compare(left.corpusRole, right.corpusRole) ||
        compare(left.declaredKey, right.declaredKey) ||
        compare(left.constraintId, right.constraintId) ||
        compare(left.endpoint, right.endpoint),
    );
    return Object.freeze({
      state: "available",
      endpoints: Object.freeze(endpoints),
      diagnosticCodes: Object.freeze([]),
    });
  }
}
