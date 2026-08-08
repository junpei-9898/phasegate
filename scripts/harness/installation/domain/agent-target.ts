// @unit installation
// @layer domain
// @work-item-id WI-385

export const AGENT_TARGETS = ["claude", "codex", "both", "grok", "antigravity", "all"] as const;

export type AgentTarget = (typeof AGENT_TARGETS)[number];

export interface AgentTargetSelection {
  readonly claudeHook: boolean;
  readonly claudeContext: boolean;
  readonly claudeSkills: boolean;
  readonly codexHook: boolean;
  readonly codexSkills: boolean;
  readonly agentsContext: boolean;
  readonly antigravityHook: boolean;
  readonly antigravitySkills: boolean;
}

export function isAgentTarget(value: string): value is AgentTarget {
  return (AGENT_TARGETS as readonly string[]).includes(value);
}

export function resolveAgentTarget(target: AgentTarget): AgentTargetSelection {
  const includesClaude = target === "claude" || target === "both" || target === "all";
  const includesCodex = target === "codex" || target === "both" || target === "all";
  const includesGrok = target === "grok" || target === "all";
  const includesAntigravity = target === "antigravity" || target === "all";
  return Object.freeze({
    claudeHook: includesClaude || includesGrok,
    claudeContext: includesClaude,
    claudeSkills: includesClaude || includesGrok,
    codexHook: includesCodex,
    codexSkills: includesCodex,
    agentsContext: includesCodex || includesGrok || includesAntigravity,
    antigravityHook: includesAntigravity,
    antigravitySkills: includesAntigravity,
  });
}
