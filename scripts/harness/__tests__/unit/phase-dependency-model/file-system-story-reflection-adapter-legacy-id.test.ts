// @unit phase-dependency-model
// @layer infrastructure
// @story H02-07
// @work-item-id WI-115
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { FileSystemStoryReflectionAdapter } from "../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js";
import { context, target } from "../../helpers/test-helpers.ts";

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "story-reflection-adapter-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target("FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation (legacy_id compatibility)", () => {
  // UT-PD-167: WI legacy_id 経由で @issue-id を検出
  context("WI frontmatter に legacy_id が存在する場合", () => {
    it("旧 issue annotation を WI の反映として検出できる", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/_cross/WI-001"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/_cross/WI-001/description.md"),
        "---\nid: WI-001\ntype: issue\nlegacy_id: ISSUE-001\n---\n",
      );
      await writeFile(path.join(rootDir, "docs/product/construction/order/logical_design.md"), "@issue-id ISSUE-001");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-001",
      );

      // Assert
      expect(actual).toBe(true);
    });
  });

  // UT-PD-168: legacy_id 不在時は旧 issue annotation を WI として扱わない
  context("WI frontmatter に legacy_id が存在しない場合", () => {
    it("旧 issue annotation を WI の反映として誤検出しない", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/_cross/WI-001"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/_cross/WI-001/description.md"),
        "---\nid: WI-001\ntype: issue\n---\n",
      );
      await writeFile(path.join(rootDir, "docs/product/construction/order/logical_design.md"), "@issue-id ISSUE-001");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-001",
      );

      // Assert
      expect(actual).toBe(false);
    });
  });

  // UT-PD-169 (WI-027): unit-scoped WI の legacy_id も解決できる
  context("unit-scoped WI directory に legacy_id が存在する場合", () => {
    it("旧 H-ID annotation を unit-scoped WI の反映として検出できる", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/WI-074"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/order/WI-074/description.md"),
        "---\nid: WI-074\ntype: story\nlegacy_id: H03-04\n---\n",
      );
      await writeFile(path.join(rootDir, "docs/product/construction/order/logical_design.md"), "@story-id H03-04");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-074",
      );

      // Assert
      expect(actual).toBe(true);
    });
  });

  // UT-PD-170 (WI-115): 同一 scope で legacy_id が重複する場合は誤解決しない
  context("同一 unit scope 内で legacy_id が複数 WI に重複する場合", () => {
    it("旧 H-ID annotation をどちらか一方の WI として誤検出しない", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/WI-074"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/WI-075"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/order/WI-074/description.md"),
        "---\nid: WI-074\ntype: story\nlegacy_id: H03-04\n---\n",
      );
      await writeFile(
        path.join(rootDir, "docs/inception/order/WI-075/description.md"),
        "---\nid: WI-075\ntype: story\nlegacy_id: H03-04\n---\n",
      );
      await writeFile(path.join(rootDir, "docs/product/construction/order/logical_design.md"), "@story-id H03-04");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-074",
      );

      // Assert
      expect(actual).toBe(false);
    });
  });

  // UT-PD-171 (WI-115): unit context がある場合は他 unit の同一 legacy_id に影響されない
  context("別 unit に同じ legacy_id が存在する場合", () => {
    it("product path の unit scope 内で WI を解決する", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/WI-074"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/payment/WI-075"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/order/WI-074/description.md"),
        "---\nid: WI-074\ntype: story\nlegacy_id: H03-04\n---\n",
      );
      await writeFile(
        path.join(rootDir, "docs/inception/payment/WI-075/description.md"),
        "---\nid: WI-075\ntype: story\nlegacy_id: H03-04\n---\n",
      );
      await writeFile(path.join(rootDir, "docs/product/construction/order/logical_design.md"), "@story-id H03-04");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-074",
      );

      // Assert
      expect(actual).toBe(true);
    });
  });

  // UT-PD-172 (WI-115): unit context がない場合は inception 全体の重複を曖昧として扱う
  context("product path から unit context を推定できない場合", () => {
    it("別 unit の同一 legacy_id も ambiguity として誤検出しない", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/WI-074"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/payment/WI-075"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/product"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/order/WI-074/description.md"),
        "---\nid: WI-074\ntype: story\nlegacy_id: H03-04\n---\n",
      );
      await writeFile(
        path.join(rootDir, "docs/inception/payment/WI-075/description.md"),
        "---\nid: WI-075\ntype: story\nlegacy_id: H03-04\n---\n",
      );
      await writeFile(path.join(rootDir, "docs/product/user_stories.md"), "@story-id H03-04");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/user_stories.md",
        "WI-074",
      );

      // Assert
      expect(actual).toBe(false);
    });
  });
});
