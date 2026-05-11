// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-147

import { describe, expect, it } from "vitest";
import { reverseJsonMerge, reversePackageJsonMerge, reverseShellMerge } from "../../../installation/application/usecases/run-uninstall.js";
import { target } from "../../helpers/test-helpers.js";

target("RunUninstallUseCase", () => {
  describe("reverse merge helpers", () => {
    it("JSON hooks と deny は phasegate template 由来だけを削除して user 設定を保持すること", () => {
      // Arrange
      const current = JSON.stringify({
        hooks: {
          Stop: [
            { matcher: "", hooks: [{ type: "command", command: "custom stop" }] },
            { matcher: "", hooks: [{ type: "command", command: "npx phasegate hook stop" }] },
          ],
        },
        permissions: { deny: ["Read(./node_modules/**)", "Bash(custom *)"] },
      });
      const template = JSON.stringify({
        hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: "npx phasegate hook stop" }] }] },
        permissions: { deny: ["Read(./node_modules/**)"] },
      });

      // Act
      const actual = reverseJsonMerge(current, template);

      // Assert
      expect(actual).toContain("custom stop");
      expect(actual).toContain("Bash(custom *)");
      expect(actual).not.toContain("npx phasegate hook stop");
      expect(actual).not.toContain("Read(./node_modules/**)");
    });

    it("shell managed block だけを削除して user script を保持すること", () => {
      // Arrange
      const current = [
        "echo custom before",
        "# === phasegate managed (BEGIN) ===",
        "npx phasegate lint",
        "# === phasegate managed (END) ===",
        "echo custom after",
        "",
      ].join("\n");

      // Act
      const actual = reverseShellMerge(current);

      // Assert
      expect(actual).toContain("echo custom before");
      expect(actual).toContain("echo custom after");
      expect(actual).not.toContain("phasegate managed");
      expect(actual).not.toContain("npx phasegate lint");
    });

    it("package.json は phasegate devDependency と phasegate:* scripts だけを削除すること", () => {
      // Arrange
      const current = JSON.stringify({
        scripts: { test: "vitest", "phasegate:doctor": "phasegate doctor" },
        devDependencies: { phasegate: "^0.145.2", vitest: "^3.0.0" },
      });

      // Act
      const actual = reversePackageJsonMerge(current);

      // Assert
      expect(actual).toContain("\"test\": \"vitest\"");
      expect(actual).toContain("\"vitest\": \"^3.0.0\"");
      expect(actual).not.toContain("phasegate");
    });
  });
});
