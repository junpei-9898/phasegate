// @unit installation
// @layer integration
// @story H11-01
// @work-item-id WI-385

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

function phasegatePreToolEntries(document: Record<string, unknown>): Array<Record<string, unknown>> {
  const hooks = document.hooks as Record<string, unknown>;
  const entries = hooks.PreToolUse as Array<Record<string, unknown>>;
  return entries.filter((entry) =>
    (entry.hooks as Array<Record<string, unknown>>).some(
      (hook) => typeof hook.command === "string" && hook.command.includes("phasegate hook pre-tool-use"),
    ),
  );
}

target("runtime hook template contract", () => {
  describe("managed hook templates を構造検査する", () => {
    it("Claude互換のrootとbundleは四tool coverageとtimeout30を持つこと", async () => {
      // Arrange
      const paths = [resolve(".claude/settings.json"), resolve("templates/.claude/settings.json")];

      // Act
      const actual = await Promise.all(
        paths.map(async (path) => {
          const document = JSON.parse(await readFile(path, "utf8"));
          const entries = phasegatePreToolEntries(document);
          const matchers = entries.map((entry) => new RegExp(`^(?:${String(entry.matcher)})$`));
          const commands = entries
            .flatMap((entry) => entry.hooks as Array<Record<string, unknown>>)
            .filter((hook) => typeof hook.command === "string" && hook.command.includes("phasegate hook pre-tool-use"));
          return {
            covered: ["Bash", "Write", "Edit", "apply_patch"].every((tool) =>
              matchers.some((matcher) => matcher.test(tool)),
            ),
            timeouts: commands.map((command) => command.timeout),
          };
        }),
      );

      // Assert
      expect(actual).toEqual([
        { covered: true, timeouts: [30, 30] },
        { covered: true, timeouts: [30, 30] },
      ]);
    });

    it("反重力bundleはnamed mapの正規表現とcommand timeoutを持つこと", async () => {
      // Arrange
      const document = JSON.parse(await readFile(resolve("templates/.agents/hooks.json"), "utf8"));

      // Act
      const actual = document["phasegate-gate"].PreToolUse[0];

      // Assert
      const matcher = new RegExp(actual.matcher);
      expect(
        ["write_to_file", "replace_file_content", "multi_replace_file_content", "run_command"].every((tool) =>
          matcher.test(tool),
        ),
      ).toBe(true);
      expect(actual.hooks).toEqual([{ type: "command", command: "npx phasegate hook pre-tool-use", timeout: 30 }]);
    });
  });
});
