// @layer test
// @story H02-02
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Artifact } from "../../../phase-dependency-model/domain/values/artifact.js";
import { PhaseLevel } from "../../../phase-dependency-model/domain/values/phase-level.js";
import { PhaseNode } from "../../../phase-dependency-model/domain/values/phase-node.js";
import { PlanningMode } from "../../../phase-dependency-model/domain/values/planning-mode.js";
import { MarkdownPlanDocumentReader } from "../../../phase-dependency-model/infrastructure/filesystem/markdown-plan-document-reader.js";
import { context, target } from "../../helpers/test-helpers.js";

let tmpDir: string;

function createTmpDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdm-plan-reader-"));
  return tmpDir;
}

function writeFile(rootDir: string, relativePath: string, content: string): void {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function createNodeWithPlan(): PhaseNode {
  return PhaseNode.create({
    skillName: "unit-design",
    level: PhaseLevel.create(2),
    artifacts: [
      Artifact.create({
        name: "unit-plan",
        path: "docs/units/{unit}/unit_plan.md",
        required: true,
      }),
    ],
  });
}

function createNodeWithoutPlan(): PhaseNode {
  return PhaseNode.create({
    skillName: "unit-design",
    level: PhaseLevel.create(2),
    artifacts: [
      Artifact.create({
        name: "design-doc",
        path: "docs/units/{unit}/design.md",
        required: true,
      }),
    ],
  });
}

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

target("MarkdownPlanDocumentReader.readEvidence", () => {
  describe("Plan文書からエビデンスを読み取る", () => {
    context("plan文書が存在しQAセクションにQ:/A:ペアが揃っている場合(embedded-qa)", () => {
      it("旧形式の質問と回答が対応するとQA完了として返されること", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = ["# Unit Plan", "", "## QA", "Q: 質問1", "A: 回答1", "Q: 質問2", "A: 回答2"].join("\n");
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(true);
        expect(actual.planningModeMatch).toBe(true);
      });
    });

    context("番号付きQA見出しの全質問に本文付きの回答がある場合", () => {
      it("番号付きQA見出しで構造化された全質問に本文回答があるとQA完了として返されること", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = [
          "# Unit Plan",
          "",
          "## 4. QA（不明点・確認事項）",
          "### [Question] Q1: 対象範囲",
          "[Answer]",
          "対象は全Unitです。",
          "",
          "### [Question] Q2: 移行方法",
          "[Answer]",
          "段階的に移行します。",
        ].join("\n");
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(true);
        expect(actual.planningModeMatch).toBe(true);
      });
    });

    context("番号付きQA見出しに本文が空の回答マーカーを含む場合", () => {
      it("番号付きQA見出しで回答本文が空の質問を含むとQA未完了として返されること", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = [
          "# Unit Plan",
          "",
          "## 4. QA（不明点・確認事項）",
          "### [Question] Q1: 対象範囲",
          "[Answer]",
          "対象は全Unitです。",
          "",
          "### [Question] Q2: 移行方法",
          "[Answer]",
          "",
        ].join("\n");
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context("構造化された質問に回答マーカーがない場合", () => {
      it("構造化された質問に回答マーカーがないとQA未完了として返されること", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = ["# Unit Plan", "", "## 4. QA（不明点・確認事項）", "### [Question] Q1: 対象範囲"].join("\n");
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context("番号付きQAセクションの後に同レベルのセクションが続く場合", () => {
      it("QAの次の同レベルセクションにある回答を数えずQA未完了として返されること", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = [
          "# Unit Plan",
          "",
          "## 4. QA（不明点・確認事項）",
          "### [Question] Q1: 対象範囲",
          "[Answer]",
          "対象は全Unitです。",
          "### [Question] Q2: 移行方法",
          "",
          "## 5. 次セクション",
          "[Answer]",
          "段階的に移行します。",
        ].join("\n");
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context("QA見出しがあるが質問がない場合", () => {
      it("QA見出しだけで質問がないと回答必須モードではQA未完了として返されること", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = "# Unit Plan\n\n## 4. QA（不明点・確認事項）\n";
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context("plan文書が存在するがQAセクションがない場合(embedded-qa)", () => {
      it("exists=true, qaComplete=false, planningModeMatch=falseのPlanEvidenceが返される", async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", "# Unit Plan\n\nSome content");
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context("plan文書が存在しQAセクションがある場合(interactive)", () => {
      it("exists=true, qaComplete=true, planningModeMatch=trueのPlanEvidenceが返される", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = "# Unit Plan\n\n## QA\nQ: 質問\n";
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("interactive");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(true);
        expect(actual.planningModeMatch).toBe(true);
      });
    });

    context("plan文書が存在しない場合", () => {
      it("exists=false, qaComplete=false, planningModeMatch=falseのPlanEvidenceが返される", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("interactive");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(false);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context("PhaseNodeにplanArtifactがない場合", () => {
      it("exists=false, qaComplete=false, planningModeMatch=falseのPlanEvidenceが返される", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithoutPlan();
        const mode = PlanningMode.create("interactive");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(false);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context("Q:の数とA:の数が一致しない場合(embedded-qa)", () => {
      it("qaComplete=falseが返される", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = ["# Unit Plan", "", "## QA", "Q: 質問1", "A: 回答1", "Q: 質問2"].join("\n");
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    // WI-358 (issue #29): 見出しの表記ゆれで evidence 判定が落ちる罠の回帰防止。
    context("QAセクション見出しの表記ゆれ(interactive)", () => {
      const qaHeadingCases: readonly { readonly heading: string; readonly expected: boolean }[] = [
        { heading: "## QA", expected: true },
        { heading: "## 4. QA（不明点・確認事項）", expected: true },
        { heading: "## 4．QA（不明点・確認事項）", expected: true },
        { heading: "### QA", expected: true },
        { heading: "## Q&A", expected: true },
        { heading: "## Q＆A", expected: true },
        { heading: "## Quality Assurance", expected: false },
        { heading: "## 前提", expected: false },
      ];

      for (const qaHeadingCase of qaHeadingCases) {
        it(`見出し "${qaHeadingCase.heading}" のQAセクション検出が ${qaHeadingCase.expected} になること`, async () => {
          // Arrange
          const rootDir = createTmpDir();
          const content = ["# Unit Plan", "", qaHeadingCase.heading, "- 確認事項なし"].join("\n");
          writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
          const sut = new MarkdownPlanDocumentReader({ rootDir });
          const node = createNodeWithPlan();
          const mode = PlanningMode.create("interactive");

          // Act
          const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

          // Assert
          expect(actual.qaComplete).toBe(qaHeadingCase.expected);
          expect(actual.planningModeMatch).toBe(qaHeadingCase.expected);
        });
      }
    });

    context("Q&A 見出しでQ:/A:ペアが揃っている場合(embedded-qa)", () => {
      it("QA見出しと同様にQA完了として返されること", async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = ["# Unit Plan", "", "## Q&A", "Q: 質問1", "A: 回答1"].join("\n");
        writeFile(rootDir, "docs/units/my-unit/unit_plan.md", content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create("embedded-qa");

        // Act
        const actual = await sut.readEvidence(node, { unitId: "my-unit" }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(true);
        expect(actual.planningModeMatch).toBe(true);
      });
    });
  });
});
