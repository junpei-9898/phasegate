// @unit world-model
// @layer test
// @work-item-id WI-289
// @story H17-04

import { describe, expect, it } from "vitest";
import type { TraceabilityWorldReadDto } from "../../../../traceability-model/index.js";
import type { WorldHashingPort } from "../../../../world-model/domain/ports/world-hashing-port.js";
import { Sha256Digest } from "../../../../world-model/domain/value-objects/sha256-digest.js";
import { TraceabilityDesignFactAdapter } from "../../../../world-model/infrastructure/adapters/traceability-design-fact-adapter.js";

const dto: TraceabilityWorldReadDto = {
  schemaVersion: "phasegate-traceability-world-read/v1",
  units: [
    {
      unitId: "world-model",
      definitionPath: "docs/product/units/world-model_unit.md",
      constructionRoot: "docs/product/construction/world-model",
    },
  ],
  stories: [
    {
      storyId: "H17-04",
      legacyIds: [],
      sourcePath: "docs/product/user_stories.md",
      line: 10,
    },
  ],
  acceptanceCriteria: [
    {
      storyId: "H17-04",
      acId: "AC-1",
      sourcePath: "docs/product/user_stories.md",
      line: 12,
    },
  ],
  workItems: [
    {
      workItemId: "WI-289",
      legacyIds: ["ISSUE-289"],
      type: "story",
      severity: "high",
      status: "drafted",
      affects: ["world-model"],
      descriptionPath: "docs/inception/_cross/WI-289/description.md",
    },
  ],
  testReferences: [],
  diagnostics: [
    {
      code: "TM-WORLD-READ-EXAMPLE",
      subjectId: "WI-999",
      sourcePaths: ["docs/inception/_cross/WI-999/description.md"],
      message: "provider detail",
    },
  ],
};

class FixedHashingPort implements WorldHashingPort {
  sha256(): Sha256Digest {
    return Sha256Digest.create(`sha256:${"a".repeat(64)}`);
  }
}

describe("Traceability design fact adapter", () => {
  it("public plain DTOをWorkItem nodeとUnit・Story owner indexへ変換すること", async () => {
    // Arrange
    const sut = new TraceabilityDesignFactAdapter({
      facade: { read: async () => dto },
      hashingPort: new FixedHashingPort(),
    });

    // Act
    const actual = await sut.read();

    // Assert
    expect(actual.workItemNodes.map((node) => node.id.toString())).toEqual(["pgw:v1:work-item:WI-289"]);
    expect(actual.workItemNodes[0].attributes).toEqual({
      affects: ["world-model"],
      descriptionPath: "docs/inception/_cross/WI-289/description.md",
      legacyIds: ["ISSUE-289"],
      severity: "high",
      status: "drafted",
      type: "story",
    });
    expect(actual.unitIdByDefinitionPath.get("docs/product/units/world-model_unit.md")).toBe("world-model");
    expect(actual.storyIdsBySourcePath.get("docs/product/user_stories.md")).toEqual(["H17-04"]);
    expect(actual.workItemIdByDescriptionPath.get("docs/inception/_cross/WI-289/description.md")).toBe("WI-289");
  });

  it("provider diagnosticをcode・subject・paths・messageごとlossless payloadへ保持すること", async () => {
    // Arrange
    const sut = new TraceabilityDesignFactAdapter({
      facade: { read: async () => dto },
      hashingPort: new FixedHashingPort(),
    });

    // Act
    const actual = await sut.read();

    // Assert
    expect(actual.diagnostics.map((entry) => entry.toCanonicalValue())).toEqual([
      {
        code: "provider-diagnostic",
        line: null,
        nodeId: null,
        pathKey: "docs/inception/_cross/WI-999/description.md",
        payload: {
          message: "provider detail",
          provider: "traceability-model",
          providerCode: "TM-WORLD-READ-EXAMPLE",
          sourcePaths: ["docs/inception/_cross/WI-999/description.md"],
          subjectId: "WI-999",
        },
      },
    ]);
  });
});
