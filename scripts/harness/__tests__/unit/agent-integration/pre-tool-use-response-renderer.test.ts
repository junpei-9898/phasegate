// @unit agent-integration
// @layer presentation
// @story H11-02
// @work-item-id WI-385

import { describe, expect, it } from "vitest";
import { PreToolUseResponseRenderer } from "../../../agent-integration/presentation/pre-tool-use-response-renderer.js";

describe("PreToolUseResponseRenderer", () => {
  it("従来profile拒否はstdoutを空にしてstderrとexit2を返すこと", () => {
    // Arrange
    const renderer = new PreToolUseResponseRenderer();

    // Act
    const actual = renderer.deny("LEGACY_EXIT_ONLY", "拒否理由");

    // Assert
    expect(actual).toEqual({ stdout: "", stderr: "拒否理由\n", exitCode: 2 });
  });

  it("互換profile拒否はtopLevelとClaude出力を同じJSONへ含めること", () => {
    // Arrange
    const renderer = new PreToolUseResponseRenderer();

    // Act
    const actual = renderer.deny("COMPATIBILITY_DENY_ENVELOPE", "拒否理由");

    // Assert
    expect(JSON.parse(actual.stdout)).toEqual({
      decision: "deny",
      reason: "拒否理由",
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "拒否理由",
      },
    });
    expect(actual.stderr).toBe("拒否理由\n");
    expect(actual.exitCode).toBe(2);
  });

  it("最上位profile拒否はdocumented二fieldだけをJSONへ含めること", () => {
    // Arrange
    const renderer = new PreToolUseResponseRenderer();

    // Act
    const actual = renderer.deny("TOP_LEVEL_DENY_ENVELOPE", "拒否理由");

    // Assert
    expect(JSON.parse(actual.stdout)).toEqual({ decision: "deny", reason: "拒否理由" });
    expect(actual.stderr).toBe("拒否理由\n");
    expect(actual.exitCode).toBe(2);
  });

  it("許可応答は全profileで空stdoutかつexit0を維持すること", () => {
    // Arrange
    const renderer = new PreToolUseResponseRenderer();

    // Act
    const actual = [
      renderer.allow("LEGACY_EXIT_ONLY"),
      renderer.allow("COMPATIBILITY_DENY_ENVELOPE"),
      renderer.allow("TOP_LEVEL_DENY_ENVELOPE"),
    ];

    // Assert
    expect(actual).toEqual([
      { stdout: "", stderr: "", exitCode: 0 },
      { stdout: "", stderr: "", exitCode: 0 },
      { stdout: "", stderr: "", exitCode: 0 },
    ]);
  });

  it("特殊文字入り理由もparse可能JSONと同一stderrへ安全に描画すること", () => {
    // Arrange
    const renderer = new PreToolUseResponseRenderer();
    const reason = '改行\nと"引用"';

    // Act
    const actual = renderer.deny("TOP_LEVEL_DENY_ENVELOPE", reason);

    // Assert
    expect(JSON.parse(actual.stdout)).toEqual({ decision: "deny", reason });
    expect(actual.stderr).toBe(`${reason}\n`);
  });
});
