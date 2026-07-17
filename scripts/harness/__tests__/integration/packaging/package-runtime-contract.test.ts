// @unit skill-quality
// @layer integration
// @story H12-05
// @work-item-id WI-181
// @work-item-id WI-313

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

target("Package runtime contract", () => {
  describe("skill cascade update dependencies", () => {
    it("packaged runtime が tinyglobby を import する場合 dependencies に宣言されること", async () => {
      // Arrange
      const root = process.cwd();
      const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
      };
      const compositionRoot = await readFile(join(root, "scripts/harness/skill-quality/composition-root.ts"), "utf8");

      // Act
      const actual = {
        importsTinyglobby: compositionRoot.includes("import('tinyglobby')"),
        declaredDependency: packageJson.dependencies?.tinyglobby,
      };

      // Assert
      expect(actual).toEqual({
        importsTinyglobby: true,
        declaredDependency: "^0.2.15",
      });
    });
  });

  describe("typescript peer dependency range", () => {
    it("peer range が classic compiler API を持たない TypeScript 7 系を許容しないこと", async () => {
      // Arrange
      const root = process.cwd();
      const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
        peerDependencies?: Record<string, string>;
      };

      // Act
      const actual = packageJson.peerDependencies?.typescript;

      // Assert
      // TypeScript 7 は exports "." が version 文字列のみになり ts.ScriptTarget 等の
      // classic API が undefined になるため、peer 解決で 7 系が入ると全コマンドがクラッシュする（GitHub #34）
      expect(actual).toBe(">=5.0.0 <7.0.0");
    });
  });
});
