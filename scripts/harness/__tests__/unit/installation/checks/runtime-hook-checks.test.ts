// @unit installation
// @layer application
// @story H11-01
// @work-item-id WI-385

import { describe, expect, it, vi } from "vitest";
import { AntigravityHookMissingCheck } from "../../../../installation/application/checks/antigravity-hook-missing-check.js";
import { GrokHookMissingCheck } from "../../../../installation/application/checks/grok-hook-missing-check.js";
import { createInspector } from "./check-test-helpers.js";

function grokSettings(matcher = "Bash|Write|Edit|apply_patch", timeout: number | null = 30) {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher,
          hooks: [{ type: "command", command: "npx phasegate hook pre-tool-use", ...(timeout === null ? {} : { timeout }) }],
        },
      ],
    },
  };
}

function antigravityHooks(
  matcher = "^(write_to_file|replace_file_content|multi_replace_file_content|run_command)$",
  timeout = 30,
) {
  return {
    "phasegate-gate": {
      PreToolUse: [
        {
          matcher,
          hooks: [{ type: "command", command: "npx phasegate hook pre-tool-use", timeout }],
        },
      ],
    },
  };
}

describe("runtime hook structural checks", () => {
  it("Grok互換entryが全matcherとtimeout30を持てばfindingなしになること", async () => {
    // Arrange
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue(grokSettings()),
    });

    // Act
    const actual = await new GrokHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual).toBeNull();
  });

  it("Grok互換matcherからapplyPatchが欠けるとmechanical redになること", async () => {
    // Arrange
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue(grokSettings("Bash|Write|Edit")),
    });

    // Act
    const actual = await new GrokHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual).toMatchObject({ checkId: "grok-hook-missing", severity: "red", repairMode: "mechanical" });
    expect(actual?.message).toContain("apply_patch");
  });

  it("Grok互換commandのtimeout欠落は30秒hint付きredになること", async () => {
    // Arrange
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue(grokSettings("Bash|Write|Edit|apply_patch", null)),
    });

    // Act
    const actual = await new GrokHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual?.message).toContain("timeout=30");
    expect(actual?.repairHint).toContain("30");
  });

  it("Grok互換commandのtypeがcommand以外ならredになること", async () => {
    // Arrange
    const settings = grokSettings();
    settings.hooks.PreToolUse[0].hooks[0].type = "prompt";
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue(settings),
    });

    // Act
    const actual = await new GrokHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual).toMatchObject({ checkId: "grok-hook-missing", severity: "red" });
    expect(actual?.message).toContain("type=command");
  });

  it("反重力named definitionが正規matcherとtimeoutを持てばfindingなしになること", async () => {
    // Arrange
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue(antigravityHooks()),
    });

    // Act
    const actual = await new AntigravityHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual).toBeNull();
  });

  it("反重力matcherとtimeoutが古い場合は不足要素をredへ列挙すること", async () => {
    // Arrange
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue(antigravityHooks("run_command", 5)),
    });

    // Act
    const actual = await new AntigravityHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual).toMatchObject({ checkId: "antigravity-hook-missing", severity: "red", repairMode: "mechanical" });
    expect(actual?.message).toContain("write_to_file");
    expect(actual?.message).toContain("timeout=30");
  });

  it("反重力matcherとphasegate commandを別entryへ分割しても網羅扱いしないこと", async () => {
    // Arrange
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue({
        "phasegate-gate": {
          PreToolUse: [
            {
              matcher: "^(write_to_file|replace_file_content|multi_replace_file_content|run_command)$",
              hooks: [{ type: "command", command: "echo not-phasegate", timeout: 30 }],
            },
            {
              matcher: "^never_matches$",
              hooks: [{ type: "command", command: "npx phasegate hook pre-tool-use", timeout: 30 }],
            },
          ],
        },
      }),
    });

    // Act
    const actual = await new AntigravityHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual).toMatchObject({ checkId: "antigravity-hook-missing", severity: "red" });
    expect(actual?.message).toContain("matcher:write_to_file");
  });

  it("反重力JSONを読めない場合はmanual redを返すこと", async () => {
    // Arrange
    const inspector = createInspector({
      exists: vi.fn().mockResolvedValue(true),
      readJson: vi.fn().mockResolvedValue(null),
    });

    // Act
    const actual = await new AntigravityHookMissingCheck().run("/tmp/project", inspector);

    // Assert
    expect(actual).toMatchObject({ checkId: "antigravity-hook-missing", repairMode: "manual" });
  });
});
