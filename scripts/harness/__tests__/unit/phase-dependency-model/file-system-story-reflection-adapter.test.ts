// @unit phase-dependency-model
// @layer infrastructure
// @story H02-04
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

target("FileSystemStoryReflectionAdapter#listStoryDirectories", () => {
  context("inception/{unit}/ 配下に storyId ディレクトリが複数ある場合", () => {
    it("ディレクトリ名一覧を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/US-001"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/US-002"), { recursive: true });
      await writeFile(path.join(rootDir, "docs/inception/order/README.md"), "# ignore");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("order");

      // Assert
      expect([...result].sort()).toEqual(["US-001", "US-002"]);
    });
  });

  context("inception/{unit}/ が存在しない場合", () => {
    it("空配列を返す", async () => {
      // Arrange
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("missing");

      // Assert
      expect(result).toEqual([]);
    });
  });

  context("_shared ディレクトリは除外する", () => {
    it("_shared / _* / . で始まるディレクトリは含まない", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/_shared"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/.cache"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/US-001"), { recursive: true });
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("order");

      // Assert
      expect([...result]).toEqual(["US-001"]);
    });
  });

  context("WI layout のディレクトリが存在する場合 (WI-026 G2-5 後: legacy issues 分岐廃止)", () => {
    it("unit-owned WI / 既存 H- ID と cross WI を reflection 対象IDとして返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/order/WI-001"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/order/H02-05"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/_cross/WI-026"), { recursive: true });
      await mkdir(path.join(rootDir, "docs/inception/_cross/memo"), { recursive: true });
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const result = await adapter.listStoryDirectories("order");

      // Assert
      expect([...result]).toEqual(["H02-05", "WI-001", "WI-026"]);
    });
  });
});

target("FileSystemStoryReflectionAdapter#fileExists", () => {
  it("ファイルが存在すれば true", async () => {
    // Arrange
    await mkdir(path.join(rootDir, "docs/inception/order/US-001"), { recursive: true });
    await writeFile(path.join(rootDir, "docs/inception/order/US-001/logical_design.md"), "# test");
    const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

    // Act
    const actual = await adapter.fileExists("docs/inception/order/US-001/logical_design.md");

    // Assert
    expect(actual).toBe(true);
  });

  it("ファイルが存在しなければ false", async () => {
    // Arrange
    const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

    // Act
    const actual = await adapter.fileExists("docs/inception/order/US-001/missing.md");

    // Assert
    expect(actual).toBe(false);
  });
});

target("FileSystemStoryReflectionAdapter#storyAffectsUnit", () => {
  context("cross WI の frontmatter に affects が存在する場合", () => {
    it("対象Unitが含まれていれば true を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/_cross/WI-026"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/_cross/WI-026/description.md"),
        "---\nid: WI-026\ntype: issue\naffects: [order, billing]\n---\n",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.storyAffectsUnit("WI-026", "order");

      // Assert
      expect(actual).toBe(true);
    });

    it("対象Unitが含まれていなければ false を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/inception/_cross/WI-026"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/inception/_cross/WI-026/description.md"),
        "---\nid: WI-026\ntype: issue\naffects: [order]\n---\n",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.storyAffectsUnit("WI-026", "billing");

      // Assert
      expect(actual).toBe(false);
    });
  });
});

target("FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation", () => {
  context("product 文書内に @story-id アノテーションが存在する場合", () => {
    it("true を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/product/construction/order/logical_design.md"),
        "# Order\n\n<!-- @story-id US-001 -->\n本文...",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "US-001",
      );

      // Assert
      expect(actual).toBe(true);
    });
  });

  context("別の storyId のみがある場合", () => {
    it("false を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/product/construction/order/logical_design.md"),
        "<!-- @story-id US-002 -->",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "US-001",
      );

      // Assert
      expect(actual).toBe(false);
    });
  });

  context("product 文書が存在しない場合", () => {
    it("false を返す", async () => {
      // Arrange
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const actual = await adapter.fileContainsStoryAnnotation("docs/product/construction/order/missing.md", "US-001");

      // Assert
      expect(actual).toBe(false);
    });
  });

  context("@story-id の後ろに複数 ID がカンマ区切りで並ぶ場合", () => {
    it("該当 ID を検出できる", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/product/construction/order/logical_design.md"),
        "@story-id US-001, US-002, US-003",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const a = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "US-002",
      );
      const b = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "US-999",
      );

      // Assert
      expect(a).toBe(true);
      expect(b).toBe(false);
    });
  });

  // UT-PD-153: @issue-id 検出
  context("product 文書内に @issue-id アノテーションが存在する場合", () => {
    it("指定した ISSUE ID に対して true を返し、未知 ID には false を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/product/construction/order/logical_design.md"),
        "# Order\n\n@issue-id ISSUE-026\n本文...",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const hit = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "ISSUE-026",
      );
      const miss = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "ISSUE-999",
      );

      // Assert
      expect(hit).toBe(true);
      expect(miss).toBe(false);
    });
  });

  // UT-PD-154: @work-item-id 検出
  context("product 文書内に @work-item-id アノテーションが存在する場合", () => {
    it("指定した WI ID に対して true を返し、未知 ID には false を返す", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(path.join(rootDir, "docs/product/construction/order/logical_design.md"), "@work-item-id WI-001");
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const hit = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-001",
      );
      const miss = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-999",
      );

      // Assert
      expect(hit).toBe(true);
      expect(miss).toBe(false);
    });
  });

  // UT-PD-155: @work-item-id を HTML コメントで検出
  context("@work-item-id が HTML コメント内に記述されている場合", () => {
    it("コメント閉じ記号の影響を受けずに検出できる", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/product/construction/order/logical_design.md"),
        "# Order\n\n<!-- @work-item-id WI-001 -->\n本文",
      );
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

  // UT-PD-156: @work-item-id のカンマ区切り複数 ID
  context("@work-item-id の後ろに複数 ID がカンマ区切りで並ぶ場合", () => {
    it("列挙された全 ID を検出できる", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/product/construction/order/logical_design.md"),
        "@work-item-id WI-001, WI-002, WI-003",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const a = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-001",
      );
      const b = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-002",
      );
      const c = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-003",
      );
      const d = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-004",
      );

      // Assert
      expect(a).toBe(true);
      expect(b).toBe(true);
      expect(c).toBe(true);
      expect(d).toBe(false);
    });
  });

  // UT-PD-157: 異なる種別のアノテーションが混在しても独立検出できる
  context("@story-id と @work-item-id が同一ファイルに混在する場合", () => {
    it("いずれの ID でも独立に検出できる", async () => {
      // Arrange
      await mkdir(path.join(rootDir, "docs/product/construction/order"), { recursive: true });
      await writeFile(
        path.join(rootDir, "docs/product/construction/order/logical_design.md"),
        "@story-id H02-04\n@work-item-id WI-001\n本文",
      );
      const adapter = new FileSystemStoryReflectionAdapter({ rootDir });

      // Act
      const story = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "H02-04",
      );
      const wi = await adapter.fileContainsStoryAnnotation(
        "docs/product/construction/order/logical_design.md",
        "WI-001",
      );

      // Assert
      expect(story).toBe(true);
      expect(wi).toBe(true);
    });
  });

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
});
