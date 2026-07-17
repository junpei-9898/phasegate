// @unit installation
// @layer domain
// @work-item-id WI-145
// @work-item-id WI-215
// @work-item-id WI-330

export const CHECK_IDS = [
  "claude-hook-missing",
  "claude-context-missing",
  "codex-hook-missing",
  "codex-context-missing",
  "husky-pre-commit-missing",
  "husky-commit-msg-missing",
  "husky-pre-push-missing",
  "ci-workflow-missing",
  "package-json-devdep-missing",
  "claude-skills-symlink",
  "codex-skills-symlink",
  "wi-workflow-drift",
  "config-status",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

export function isCheckId(value: string): value is CheckId {
  return (CHECK_IDS as readonly string[]).includes(value);
}
