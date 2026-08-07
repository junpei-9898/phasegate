// @unit agent-integration
// @layer integration
// @story H11-02
// @story H11-03
// @work-item-id WI-384

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(currentDirectory, "../../../../..");

describe("Codex hook matcher configuration", () => {
  it("root と bundled template が byte-equivalent で pre と post の canonical matcher を持つこと", async () => {
    // Arrange
    const rootPath = path.join(HARNESS_ROOT, ".codex/hooks.json");
    const templatePath = path.join(HARNESS_ROOT, "templates/.codex/hooks.json");

    // Act
    const actual = await Promise.all([readFile(rootPath, "utf8"), readFile(templatePath, "utf8")]);
    const parsed = JSON.parse(actual[0]) as {
      hooks: { PreToolUse: { matcher?: string }[]; PostToolUse: { matcher?: string }[] };
    };

    // Assert
    expect(actual[0]).toBe(actual[1]);
    expect(parsed.hooks.PreToolUse[0]?.matcher).toBe("Bash|apply_patch");
    expect(parsed.hooks.PostToolUse[0]?.matcher).toBe("Bash|apply_patch");
  });
});
