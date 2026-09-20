// @unit installation
// @layer application
// @work-item-id WI-216
// @work-item-id WI-223

export type SkillSet = "core" | "all" | "consumer";
export type SkillCategory = "core" | "aidlc" | "utility" | "guidance";

const CORE_SKILLS = [
  "cascade-updater",
  "codebase-mapper",
  "consistency-checker",
  "doc-health-checker",
  "engineering-perspective",
  "implementation-readiness-checker",
  "test-coverage-checker",
] as const;

const AIDLC_SKILLS = [
  "domain-designer",
  "environment-designer",
  "it-test-designer",
  "it-test-logic-designer",
  "logical-designer",
  "mock-designer",
  "product-architect",
  "quick-implementor",
  "scenario-test-designer",
  "scenario-test-logic-designer",
  "story-implementor",
  "story-mapper",
  "story-writer",
  "uiux-designer",
  "unit-designer",
  "unit-test-designer",
  "unit-test-logic-designer",
] as const;

const UTILITY_SKILLS = ["codex-delegator", "skill-creator"] as const;
const GUIDANCE_SKILLS = ["phasegate-toolkit-guide", "phasegate-config-doctor", "release-publisher"] as const;

export const SKILL_CATEGORIES: Record<SkillCategory, readonly string[]> = {
  core: CORE_SKILLS,
  aidlc: AIDLC_SKILLS,
  utility: UTILITY_SKILLS,
  guidance: GUIDANCE_SKILLS,
};

export function isSkillSet(value: unknown): value is SkillSet {
  return value === "core" || value === "all" || value === "consumer";
}

export function resolveInstalledSkillSet(metadata: string | null): SkillSet {
  try {
    const value: unknown = JSON.parse(metadata ?? "null");
    if (typeof value === "object" && value !== null && "skillSet" in value && isSkillSet(value.skillSet)) {
      return value.skillSet;
    }
  } catch { /* Legacy installations without readable metadata retain the all set. */ }
  return "all";
}

export function getBundledSkillsForSet(skillSet: SkillSet): string[] {
  if (skillSet === "core") return [...CORE_SKILLS];
  const all = [...CORE_SKILLS, ...AIDLC_SKILLS, ...UTILITY_SKILLS, ...GUIDANCE_SKILLS];
  return skillSet === "consumer"
    ? all.filter(name => name !== "release-publisher" && name !== "skill-creator")
    : all;
}
