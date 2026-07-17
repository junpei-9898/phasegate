// @unit world-model
// @layer unit
// @work-item-id WI-305
// @story H17-17

import { describe, expect, it } from "vitest";
import { PinnedDesignEndpointFacade } from "../../../../world-model/application/facades/pinned-design-endpoint-facade.js";
import type { ConstraintDeclarationRepositoryPort } from "../../../../world-model/application/ports/world-control-declaration-repository-port.js";

const pin = (nodeId: string) => ({ nodeId: { toString: () => nodeId } });
const record = {
  constraintId: { toString: () => "pgw:v1:constraint:design-change" },
  claimant: pin("pgw:v1:fragment:product:agent-integration.design-change-declaration"),
  premise: pin("pgw:v1:fragment:legacy:design-document:product:docs%2Fproduct%2Flegacy.md"),
};

describe("PinnedDesignEndpointFacade", () => {
  it("explicit fragment endpointだけをplain DTOへ投影すること", async () => {
    // Arrange
    const repository = {
      load: async () => ({
        state: "loaded" as const,
        value: { records: [record], malformedDeclarations: [], diagnostics: [] },
        diagnostics: [],
      }),
    } as unknown as ConstraintDeclarationRepositoryPort;

    // Act
    const actual = await new PinnedDesignEndpointFacade(repository).read();

    // Assert
    expect(actual).toEqual({
      state: "available",
      endpoints: [
        {
          constraintId: "pgw:v1:constraint:design-change",
          endpoint: "claimant",
          nodeId: "pgw:v1:fragment:product:agent-integration.design-change-declaration",
          corpusRole: "product",
          declaredKey: "agent-integration.design-change-declaration",
        },
      ],
      diagnosticCodes: [],
    });
  });

  it("invalid control inputをemptyへfallbackしないこと", async () => {
    // Arrange
    const repository = {
      load: async () => ({ state: "invalid" as const, diagnostics: [{ code: "unsupported-schema-version" }] }),
    } as unknown as ConstraintDeclarationRepositoryPort;

    // Act
    const actual = await new PinnedDesignEndpointFacade(repository).read();

    // Assert
    expect(actual).toEqual({ state: "unavailable", diagnosticCodes: ["unsupported-schema-version"] });
  });
});
