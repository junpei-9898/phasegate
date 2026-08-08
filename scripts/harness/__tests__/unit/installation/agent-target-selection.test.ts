// @unit installation
// @layer domain
// @story H11-01
// @work-item-id WI-385

import { describe, expect, it } from "vitest";
import { resolveAgentTarget } from "../../../installation/domain/agent-target.js";

describe("resolveAgentTarget", () => {
  it("両既存targetはClaudeとCodexだけを選び意味を維持すること", () => {
    // Arrange
    const target = "both";

    // Act
    const actual = resolveAgentTarget(target);

    // Assert
    expect(actual).toEqual({
      claudeHook: true,
      claudeContext: true,
      claudeSkills: true,
      codexHook: true,
      codexSkills: true,
      agentsContext: true,
      antigravityHook: false,
      antigravitySkills: false,
    });
  });

  it("全runtime targetはGrok重複なしで三hook surfaceを選ぶこと", () => {
    // Arrange
    const target = "all";

    // Act
    const actual = resolveAgentTarget(target);

    // Assert
    expect(actual).toEqual({
      claudeHook: true,
      claudeContext: true,
      claudeSkills: true,
      codexHook: true,
      codexSkills: true,
      agentsContext: true,
      antigravityHook: true,
      antigravitySkills: true,
    });
  });

  it("Grok単独targetは互換hookとClaude互換skillsとAGENTSを選ぶこと", () => {
    // Arrange
    const target = "grok";

    // Act
    const actual = resolveAgentTarget(target);

    // Assert
    expect(actual).toEqual({
      claudeHook: true,
      claudeContext: false,
      claudeSkills: true,
      codexHook: false,
      codexSkills: false,
      agentsContext: true,
      antigravityHook: false,
      antigravitySkills: false,
    });
  });

  it("反重力単独targetはnamed hookと固有skillsとAGENTSを選ぶこと", () => {
    // Arrange
    const target = "antigravity";

    // Act
    const actual = resolveAgentTarget(target);

    // Assert
    expect(actual).toEqual({
      claudeHook: false,
      claudeContext: false,
      claudeSkills: false,
      codexHook: false,
      codexSkills: false,
      agentsContext: true,
      antigravityHook: true,
      antigravitySkills: true,
    });
  });
});
