// @unit installation
// @layer application
// @work-item-id WI-216

export type SkillSet = "core" | "all";

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

export function getBundledSkillsForSet(skillSet: SkillSet): string[] {
  if (skillSet === "core") return [...CORE_SKILLS];
  return [...CORE_SKILLS, ...AIDLC_SKILLS, ...UTILITY_SKILLS, ...GUIDANCE_SKILLS];
}
