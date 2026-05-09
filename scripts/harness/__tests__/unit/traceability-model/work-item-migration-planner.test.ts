// @unit traceability-model
// @layer test
// @story H03-06
// @work-item-id WI-027
// @work-item-id WI-106
import { describe, expect, it } from "vitest";
import { WorkItemMigrationPlanner } from "../../../traceability-model/domain/services/work-item-migration-planner.ts";
import type { LegacyIssueDirectory } from "../../../traceability-model/domain/value-objects/work-item-migration-candidate.ts";
import { context, target } from "../../helpers/test-helpers.ts";

const createEntry = (overrides: Partial<LegacyIssueDirectory> = {}): LegacyIssueDirectory => ({
  legacyId: "ISSUE-026",
  sourcePath: "docs/inception/issues/ISSUE-026",
  scope: "cross",
  descriptionFileName: "issue_description.md",
  content: "- **影響Unit**: traceability-model, phase-dependency-model\n- **深刻度**: High\n",
  targetExists: false,
  ...overrides,
});

const createHIdEntry = (overrides: Partial<LegacyIssueDirectory> = {}): LegacyIssueDirectory => ({
  legacyId: "H02-04",
  sourcePath: "docs/inception/phase-dependency-model/H02-04",
  scope: "unit",
  unitName: "phase-dependency-model",
  descriptionFileName: "description.md",
  content: "# H02-04\n",
  targetExists: false,
  ...overrides,
});

target("WorkItemMigrationPlanner.plan", () => {
  describe("旧issueレイアウトからWI migration planを生成する", () => {
    context("cross-unit issueを渡した場合", () => {
      it("_cross配下のWI候補を返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createEntry()]);

        // Assert
        expect(actual.candidates[0].nextId).toBe("WI-026");
        expect(actual.candidates[0].targetPath).toBe("docs/inception/_cross/WI-026");
        expect(actual.candidates[0].frontmatterPreview).toContain("legacy_id: ISSUE-026");
        expect(actual.candidates[0].frontmatterPreview).toContain(
          "affects: [traceability-model, phase-dependency-model]",
        );
      });
    });

    context("unit-owned issueを渡した場合", () => {
      it("unit直下のWI候補を返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();
        const entry = createEntry({
          sourcePath: "docs/inception/traceability-model/issues/ISSUE-026",
          scope: "unit",
          unitName: "traceability-model",
        });

        // Act
        const actual = sut.plan([entry]);

        // Assert
        expect(actual.candidates[0].targetPath).toBe("docs/inception/traceability-model/WI-026");
        expect(actual.candidates[0].unitName).toBe("traceability-model");
      });
    });

    context("移動先が既に存在する場合", () => {
      it("conflict=trueを返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createEntry({ targetExists: true })]);

        // Assert
        expect(actual.candidates[0].conflict).toBe(true);
      });
    });

    context("cross-unit issueで影響Unitを抽出できない場合", () => {
      it("affects不足warningを返すこと", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createEntry({ content: "# ISSUE-026\n" })]);

        // Assert
        expect(actual.warnings[0]).toContain("cross-unit WI requires affects");
      });
    });
  });

  describe("H-ID旧storyレイアウトをWI sequential番号へ採番する", () => {
    context("H-ID entry単独を渡した場合 (UT-TM-WM19)", () => {
      it("既存WIが無い場合は若い番号から割り当てる", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createHIdEntry()], []);

        // Assert
        expect(actual.candidates[0].nextId).toBe("WI-001");
        expect(actual.candidates[0].targetPath).toBe("docs/inception/phase-dependency-model/WI-001");
        expect(actual.candidates[0].scope).toBe("unit");
      });
    });

    context("existingWorkItemIdsで占有された番号がある場合 (UT-TM-WM20)", () => {
      it("既存WI番号を skip して次の空き番号を割り当てる", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();
        const existing = Array.from({ length: 27 }, (_, i) => `WI-${String(i + 1).padStart(3, "0")}`);

        // Act
        const actual = sut.plan([createHIdEntry()], existing);

        // Assert
        expect(actual.candidates[0].nextId).toBe("WI-028");
      });
    });

    context("_crossとunit配下から収集したexistingWorkItemIdsがある場合 (WI-106)", () => {
      it("双方の既存WI番号を避けて採番する", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createHIdEntry()], ["WI-001", "WI-002"]);

        // Assert
        expect(actual.candidates[0].nextId).toBe("WI-003");
      });
    });

    context("H-ID entryのfrontmatterPreviewを生成する場合 (UT-TM-WM21)", () => {
      it("type: story と legacy_id: H{NN}-{NN} を含み、affects は付かない", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();

        // Act
        const actual = sut.plan([createHIdEntry()], []);

        // Assert
        expect(actual.candidates[0].frontmatterPreview).toContain("type: story");
        expect(actual.candidates[0].frontmatterPreview).toContain("legacy_id: H02-04");
        expect(actual.candidates[0].frontmatterPreview).not.toContain("affects:");
      });
    });

    context("ISSUE-XXXとH-IDが混在する場合 (UT-TM-WM22)", () => {
      it("ISSUE由来が予約した番号をH-IDが skip する", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();
        const existing = Array.from({ length: 25 }, (_, i) => `WI-${String(i + 1).padStart(3, "0")}`);

        // Act
        const actual = sut.plan([createEntry(), createHIdEntry()], existing);

        // Assert
        expect(actual.candidates[0].nextId).toBe("WI-026");
        expect(actual.candidates[1].nextId).toBe("WI-027");
      });
    });

    context("複数H-ID entryが連続する場合", () => {
      it("各entryに重複しないsequential WI番号を割り当てる", () => {
        // Arrange
        const sut = new WorkItemMigrationPlanner();
        const entries = [
          createHIdEntry({ legacyId: "H02-04", sourcePath: "docs/inception/phase-dependency-model/H02-04" }),
          createHIdEntry({ legacyId: "H02-05", sourcePath: "docs/inception/phase-dependency-model/H02-05" }),
          createHIdEntry({ legacyId: "H02-06", sourcePath: "docs/inception/phase-dependency-model/H02-06" }),
        ];

        // Act
        const actual = sut.plan(entries, ["WI-001"]);

        // Assert
        const ids = actual.candidates.map((c) => c.nextId);
        expect(ids).toEqual(["WI-002", "WI-003", "WI-004"]);
      });
    });
  });
});
