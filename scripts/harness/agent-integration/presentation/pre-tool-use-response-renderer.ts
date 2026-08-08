/**
 * @unit agent-integration
 * @layer presentation
 * @work-item-id WI-385
 */

import type { HookResponseProfile } from "../application/dto/normalized-pre-tool-use-request.js";

export interface RenderedPreToolUseResponse {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: 0 | 2;
}

export class PreToolUseResponseRenderer {
  deny(profile: HookResponseProfile, reason: string): RenderedPreToolUseResponse {
    if (profile === "LEGACY_EXIT_ONLY") {
      return { stdout: "", stderr: `${reason}\n`, exitCode: 2 };
    }
    const envelope =
      profile === "COMPATIBILITY_DENY_ENVELOPE"
        ? {
            decision: "deny",
            reason,
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "deny",
              permissionDecisionReason: reason,
            },
          }
        : { decision: "deny", reason };
    return { stdout: `${JSON.stringify(envelope)}\n`, stderr: `${reason}\n`, exitCode: 2 };
  }

  allow(_profile: HookResponseProfile): RenderedPreToolUseResponse {
    return { stdout: "", stderr: "", exitCode: 0 };
  }
}
