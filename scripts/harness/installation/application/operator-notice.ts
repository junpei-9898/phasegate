// @unit installation
// @layer application
// @work-item-id WI-384
// @work-item-id WI-385

export interface OperatorNotice {
  readonly code:
    | "CODEX_HOOK_TRUST_REQUIRED"
    | "CODEX_HOOK_TRUST_UNVERIFIABLE"
    | "GROK_HOOK_TRUST_UNVERIFIABLE"
    | "ANTIGRAVITY_CLI_ONLY";
  readonly level: "info";
  readonly message: string;
}

export const CODEX_HOOK_TRUST_REQUIRED_NOTICE: OperatorNotice = Object.freeze({
  code: "CODEX_HOOK_TRUST_REQUIRED",
  level: "info",
  message:
    "Codex CLI >= 0.124.0 is required for native apply_patch hooks. The hook definition hash changed; open /hooks and trust the updated definition before relying on the edit-time gate.",
});

export const CODEX_HOOK_TRUST_UNVERIFIABLE_NOTICE: OperatorNotice = Object.freeze({
  code: "CODEX_HOOK_TRUST_UNVERIFIABLE",
  level: "info",
  message:
    "Codex CLI >= 0.124.0 is required for native apply_patch hooks. Phasegate cannot verify the external trust store; open /hooks and confirm the current hook definition is trusted.",
});

export const GROK_HOOK_TRUST_UNVERIFIABLE_NOTICE: OperatorNotice = Object.freeze({
  code: "GROK_HOOK_TRUST_UNVERIFIABLE",
  level: "info",
  message:
    "Phasegate cannot verify Grok's project-hook trust state. Run grok inspect, open /hooks, and approve with --trust or /hooks-trust before relying on the edit-time gate; keep the L2 pre-commit backstop enabled.",
});

export const ANTIGRAVITY_CLI_ONLY_NOTICE: OperatorNotice = Object.freeze({
  code: "ANTIGRAVITY_CLI_ONLY",
  level: "info",
  message:
    "Antigravity hard blocking is supported for the agy CLI surface only. IDE/desktop hook execution is not guaranteed; the L2 pre-commit gate remains the primary backstop there.",
});
