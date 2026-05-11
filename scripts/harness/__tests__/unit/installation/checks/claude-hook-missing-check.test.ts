// @unit installation
// @layer test
// @story H11-01
// @work-item-id WI-145

import { describe, expect, it, vi } from "vitest";
import { ClaudeHookMissingCheck } from "../../../../installation/application/checks/claude-hook-missing-check.js";
import type { FileInspectorPort } from "../../../../installation/application/ports/file-inspector-port.js";
import { target, context } from "../../../helpers/test-helpers.js";

function createInspector(overrides: Partial<FileInspectorPort> = {}): FileInspectorPort {
  return {
    exists: vi.fn().mockResolvedValue(false),
    readText: vi.fn().mockResolvedValue(null),
    readJson: vi.fn().mockResolvedValue(null),
    readSymlink: vi.fn().mockResolvedValue(null),
    listFiles: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

target("ClaudeHookMissingCheck", () => {
  describe("Claude hookを検査する", () => {
    it("phasegate hookが存在する場合はfindingを返さないこと", async () => {
      // Arrange
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue({ hooks: { Stop: [{ command: "npx phasegate hook stop" }] } }),
      });
      const sut = new ClaudeHookMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", inspector);

      // Assert
      expect(actual).toBeNull();
    });
  });

  context("既存設定にユーザーhookがあるがphasegate hookがない場合", () => {
    it("ai-assistedのfindingを返すこと", async () => {
      // Arrange
      const inspector = createInspector({
        exists: vi.fn().mockResolvedValue(true),
        readJson: vi.fn().mockResolvedValue({ hooks: { Stop: [{ command: "custom command" }] } }),
      });
      const sut = new ClaudeHookMissingCheck();

      // Act
      const actual = await sut.run("/tmp/project", inspector);

      // Assert
      expect(actual?.checkId).toBe("claude-hook-missing");
      expect(actual?.severity).toBe("red");
      expect(actual?.repairMode).toBe("ai-assisted");
      expect(actual?.suggestedSkill?.invokeCommand).toBe("invoke /phasegate-config-doctor");
    });
  });
});
