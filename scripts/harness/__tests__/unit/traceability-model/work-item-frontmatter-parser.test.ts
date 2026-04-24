// @unit traceability-model
// @layer infrastructure
// @story H03-04

import { expect, it } from "vitest";
import { WorkItemFrontmatterValidationError } from "../../../traceability-model/domain/value-objects/work-item-frontmatter.ts";
import { parseWorkItemFrontmatter } from "../../../traceability-model/infrastructure/parsers/work-item-frontmatter-parser.ts";
import { context, target } from "../../helpers/test-helpers.ts";

target("parseWorkItemFrontmatter（H03-04 / ISSUE-026 Phase A-2）", () => {
  // UT-TM-W01
  context("frontmatter が存在しない場合", () => {
    it("null を返す", () => {
      // Arrange
      const content = "# Title\n本文のみ";

      // Act
      const actual = parseWorkItemFrontmatter(content);

      // Assert
      expect(actual).toBeNull();
    });
  });

  // UT-TM-W02
  context("最小構成（id + type のみ）の frontmatter がある場合", () => {
    it("id と type を持つ WorkItemFrontmatter を返す", () => {
      // Arrange
      const content = `---
id: WI-001
type: story
---
# Title`;

      // Act
      const actual = parseWorkItemFrontmatter(content);

      // Assert
      expect(actual).toEqual({ id: "WI-001", type: "story" });
    });
  });

  // UT-TM-W02a
  context("WI frontmatterではない通常frontmatterの場合", () => {
    it("null を返す", () => {
      // Arrange
      const content = `---
traceability:
  initial_creation: true
---
# Title`;

      // Act
      const actual = parseWorkItemFrontmatter(content);

      // Assert
      expect(actual).toBeNull();
    });
  });

  // UT-TM-W03
  context("完全構成の frontmatter がある場合", () => {
    it("全 7 フィールドが反映される", () => {
      // Arrange
      const content = `---
id: WI-026
type: issue
affects: [phase-dependency-model, agent-integration]
severity: high
status: drafted
source: github#123
legacy_id: ISSUE-026
---
# Title`;

      // Act
      const actual = parseWorkItemFrontmatter(content);

      // Assert
      expect(actual).toEqual({
        id: "WI-026",
        type: "issue",
        affects: ["phase-dependency-model", "agent-integration"],
        severity: "high",
        status: "drafted",
        source: "github#123",
        legacyId: "ISSUE-026",
      });
    });
  });

  // UT-TM-W03a
  context("ISSUE-026 の WI type 全種を指定した場合", () => {
    it("story / issue / refactor / fix / chore をすべて受理する", () => {
      // Arrange
      const types = ["story", "issue", "refactor", "fix", "chore"] as const;

      // Act
      const actual = types.map((type, index) =>
        parseWorkItemFrontmatter(`---
id: WI-${String(index + 1).padStart(3, "0")}
type: ${type}
---
# Title`),
      );

      // Assert
      expect(actual.map((frontmatter) => frontmatter?.type)).toEqual(types);
    });
  });

  // UT-TM-W04
  context("id 形式が pattern に合致しない場合", () => {
    it("WorkItemFrontmatterValidationError を throw", () => {
      // Arrange
      const content = `---
id: BROKEN
type: story
---`;

      // Act & Assert
      expect(() => parseWorkItemFrontmatter(content)).toThrow(WorkItemFrontmatterValidationError);
    });
  });

  // UT-TM-W05
  context("type が enum 外の場合", () => {
    it("WorkItemFrontmatterValidationError を throw", () => {
      // Arrange
      const content = `---
id: WI-001
type: unknown
---`;

      // Act & Assert
      expect(() => parseWorkItemFrontmatter(content)).toThrow(WorkItemFrontmatterValidationError);
    });
  });

  // UT-TM-W06
  context("severity が enum 外の場合", () => {
    it("WorkItemFrontmatterValidationError を throw", () => {
      // Arrange
      const content = `---
id: WI-001
type: story
severity: critical
---`;

      // Act & Assert
      expect(() => parseWorkItemFrontmatter(content)).toThrow(WorkItemFrontmatterValidationError);
    });
  });

  // UT-TM-W07
  context("status が enum 外の場合", () => {
    it("WorkItemFrontmatterValidationError を throw", () => {
      // Arrange
      const content = `---
id: WI-001
type: story
status: done
---`;

      // Act & Assert
      expect(() => parseWorkItemFrontmatter(content)).toThrow(WorkItemFrontmatterValidationError);
    });
  });

  // UT-TM-W08
  context("id / type が frontmatter に無い場合", () => {
    it("WI frontmatterではない通常frontmatterとして null を返す", () => {
      // Arrange
      const content = `---
severity: normal
---`;

      // Act
      const actual = parseWorkItemFrontmatter(content);

      // Assert
      expect(actual).toBeNull();
    });
  });

  // UT-TM-W09
  context("legacy ID パターン（H02-04 / ISSUE-026 / HF2-01）の場合", () => {
    it("H02-04 / ISSUE-026 / HF2-01 いずれも正常に parse される", () => {
      // Arrange
      const contentA = `---
id: H02-04
type: story
---`;
      const contentB = `---
id: ISSUE-026
type: issue
---`;
      const contentC = `---
id: HF2-01
type: refactor
---`;

      // Act
      const a = parseWorkItemFrontmatter(contentA);
      const b = parseWorkItemFrontmatter(contentB);
      const c = parseWorkItemFrontmatter(contentC);

      // Assert
      expect(a?.id).toBe("H02-04");
      expect(b?.id).toBe("ISSUE-026");
      expect(c?.id).toBe("HF2-01");
    });
  });

  // UT-TM-W10
  context("affects が block 配列記法の場合", () => {
    it("block list を string[] として抽出する", () => {
      // Arrange
      const content = `---
id: WI-001
type: story
affects:
  - phase-dependency-model
  - traceability-model
---`;

      // Act
      const actual = parseWorkItemFrontmatter(content);

      // Assert
      expect(actual?.affects).toEqual(["phase-dependency-model", "traceability-model"]);
    });
  });
});
