// @unit validator-system
// @layer unit
// @work-item-id WI-305
// @story H17-17

import { describe, expect, it } from "vitest";
import { DesignChangeDeclarationPolicy } from "../../../validator-system/domain/services/design-change-declaration-policy.js";

const changed = Object.freeze({
  corpusRole: "product" as const,
  declaredKey: "agent-integration.design-change-declaration",
  path: "docs/product/construction/agent-integration/logical_design.md",
  changeKind: "modified" as const,
  workItemIds: Object.freeze(["WI-305"]),
  reflectionTargets: Object.freeze(["inception:agent-integration.design-change-declaration"]),
});

const pin = Object.freeze({
  constraintId: "pgw:v1:constraint:design-change",
  endpoint: "claimant" as const,
  nodeId: "pgw:v1:fragment:product:agent-integration.design-change-declaration",
  corpusRole: "product" as const,
  declaredKey: "agent-integration.design-change-declaration",
});

describe("DesignChangeDeclarationPolicy", () => {
  it("pin済みfragmentとmatching Work-Item trailerを通過させること", () => {
    // Arrange
    const policy = new DesignChangeDeclarationPolicy();

    // Act
    const actual = policy.evaluate({
      changedFragments: [changed],
      pinnedEndpoints: [pin],
      trailerWorkItemIds: ["WI-305"],
    });

    // Assert
    expect(actual.findings).toEqual([]);
    expect(actual.checkedFragmentCount).toBe(1);
  });

  it("pin済みfragmentのWork-Item宣言が欠ける場合だけblockすること", () => {
    // Arrange
    const policy = new DesignChangeDeclarationPolicy();

    // Act
    const actual = policy.evaluate({
      changedFragments: [changed],
      pinnedEndpoints: [pin],
      trailerWorkItemIds: ["WI-999"],
    });

    // Assert
    expect(actual.findings).toEqual([
      expect.objectContaining({ code: "design-change-declaration-missing", declaredKey: changed.declaredKey }),
    ]);
  });

  it("unpinned fragmentへblocking面を広げないこと", () => {
    // Arrange
    const policy = new DesignChangeDeclarationPolicy();

    // Act
    const actual = policy.evaluate({ changedFragments: [changed], pinnedEndpoints: [], trailerWorkItemIds: [] });

    // Assert
    expect(actual).toEqual({ checkedFragmentCount: 0, findings: [] });
  });
});
