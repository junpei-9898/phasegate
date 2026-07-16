// @unit traceability-model
// @layer test
// @work-item-id WI-288
// @story H17-03

import { describe, expect, it } from "vitest";
import { TraceabilityWorldReadFacade } from "../../../traceability-model/application/facades/traceability-world-read-facade.js";
import type {
  TraceabilityWorldReadSourceDto,
  TraceabilityWorldReadSourcePort,
} from "../../../traceability-model/application/ports/traceability-world-read-source-port.js";

const baseSource: TraceabilityWorldReadSourceDto = {
  units: [
    {
      unitId: "traceability-model",
      definitionPath: "docs/product/units/traceability-model_unit.md",
      constructionRoot: "docs/product/construction/traceability-model",
    },
  ],
  stories: [
    {
      storyId: "H17-03",
      legacyIds: ["US-288"],
      sourcePath: "docs/product/user_stories.md",
      line: 20,
      acceptanceCriteria: [
        { acId: "AC-2", line: 25 },
        { acId: "AC-1", line: 24 },
      ],
    },
  ],
  workItems: [
    {
      directoryId: "WI-288",
      workItemId: "WI-288",
      legacyId: "ISSUE-288",
      type: "story",
      severity: "high",
      status: "drafted",
      affects: ["traceability-model"],
      descriptionPath: "docs/inception/_cross/WI-288/description.md",
    },
  ],
  testAnnotations: [
    {
      storyId: "H17-03",
      filePath: "scripts/harness/__tests__/unit/traceability-model/traceability-world-read-facade.test.ts",
      line: 4,
      testType: "unit",
    },
  ],
  diagnostics: [],
};

class DeterministicSource implements TraceabilityWorldReadSourcePort {
  constructor(private readonly value: TraceabilityWorldReadSourceDto) {}

  async read(): Promise<TraceabilityWorldReadSourceDto> {
    return this.value;
  }
}

const reverseSource = (source: TraceabilityWorldReadSourceDto): TraceabilityWorldReadSourceDto => ({
  units: [...source.units].reverse(),
  stories: [...source.stories].reverse().map((story) => ({
    ...story,
    legacyIds: [...story.legacyIds].reverse(),
    acceptanceCriteria: [...story.acceptanceCriteria].reverse(),
  })),
  workItems: [...source.workItems]
    .reverse()
    .map((workItem) => ({ ...workItem, affects: [...workItem.affects].reverse() })),
  testAnnotations: [...source.testAnnotations].reverse(),
  diagnostics: [...source.diagnostics].reverse(),
});

describe("TraceabilityWorldReadFacade", () => {
  it("domain型を漏らさずcanonical IDとlegacy aliasをplain DTOで返すこと", async () => {
    // Arrange
    const sut = new TraceabilityWorldReadFacade({
      sourcePort: new DeterministicSource(baseSource),
    });

    // Act
    const actual = await sut.read();

    // Assert
    expect(actual.schemaVersion).toBe("phasegate-traceability-world-read/v1");
    expect(actual.workItems).toEqual([
      {
        workItemId: "WI-288",
        legacyIds: ["ISSUE-288"],
        type: "story",
        severity: "high",
        status: "drafted",
        affects: ["traceability-model"],
        descriptionPath: "docs/inception/_cross/WI-288/description.md",
      },
    ]);
    expect(JSON.parse(JSON.stringify(actual))).toEqual(actual);
    expect(Object.getPrototypeOf(actual)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(actual.stories[0])).toBe(Object.prototype);
  });

  it("入力とACの列挙順に依存せずbyte-identicalなJSONを返すこと", async () => {
    // Arrange
    const first = new TraceabilityWorldReadFacade({
      sourcePort: new DeterministicSource(baseSource),
    });
    const second = new TraceabilityWorldReadFacade({
      sourcePort: new DeterministicSource(reverseSource(baseSource)),
    });

    // Act
    const [firstResult, secondResult] = await Promise.all([first.read(), second.read()]);

    // Assert
    expect(JSON.stringify(firstResult)).toBe(JSON.stringify(secondResult));
    expect(firstResult.acceptanceCriteria.map((entry) => entry.acId)).toEqual(["AC-1", "AC-2"]);
  });

  it("file-level annotationをStoryの全ACへcase名なしで射影すること", async () => {
    // Arrange
    const sut = new TraceabilityWorldReadFacade({
      sourcePort: new DeterministicSource(baseSource),
    });

    // Act
    const actual = await sut.read();

    // Assert
    expect(actual.testReferences).toHaveLength(2);
    expect(actual.testReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storyId: "H17-03",
          acId: "AC-1",
          binding: "file",
          testType: "unit",
          testName: null,
          provenance: [
            {
              sourcePath: "scripts/harness/__tests__/unit/traceability-model/traceability-world-read-facade.test.ts",
              line: 4,
            },
          ],
        }),
      ]),
    );
  });

  it("重複owner IDとdirectory不一致に勝者を選ばないこと", async () => {
    // Arrange
    const source: TraceabilityWorldReadSourceDto = {
      ...baseSource,
      stories: [baseSource.stories[0], { ...baseSource.stories[0], line: 200 }],
      workItems: [
        {
          ...baseSource.workItems[0],
          directoryId: "WI-999",
        },
      ],
    };
    const sut = new TraceabilityWorldReadFacade({
      sourcePort: new DeterministicSource(source),
    });

    // Act
    const actual = await sut.read();

    // Assert
    expect(actual.stories).toEqual([]);
    expect(actual.workItems).toEqual([]);
    expect(actual.testReferences).toEqual([]);
    expect(actual.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["TM-WORLD-READ-DUPLICATE-STORY", "TM-WORLD-READ-WORK-ITEM-ID-MISMATCH"]),
    );
  });

  it("catalogにないStoryのannotationを推論せずdiagnosticへ隔離すること", async () => {
    // Arrange
    const source: TraceabilityWorldReadSourceDto = {
      ...baseSource,
      testAnnotations: [
        {
          storyId: "H99-99",
          filePath: "scripts/harness/__tests__/unit/unknown.test.ts",
          line: 3,
          testType: "unit",
        },
      ],
    };
    const sut = new TraceabilityWorldReadFacade({
      sourcePort: new DeterministicSource(source),
    });

    // Act
    const actual = await sut.read();

    // Assert
    expect(actual.testReferences).toEqual([]);
    expect(actual.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "TM-WORLD-READ-UNKNOWN-TEST-STORY",
        subjectId: "H99-99",
      }),
    );
  });
});
