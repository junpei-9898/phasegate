/**
 * @unit agent-integration
 * @layer application
 * @work-item-id WI-385
 */

export type PayloadShape = "FLAT_SNAKE_CASE" | "FLAT_CAMEL_CASE" | "NESTED_TOOL_CALL";

export type HookResponseProfile = "LEGACY_EXIT_ONLY" | "COMPATIBILITY_DENY_ENVELOPE" | "TOP_LEVEL_DENY_ENVELOPE";

export interface CanonicalPreToolUseInput {
  readonly path?: string;
  readonly file_path?: string;
  readonly paths?: readonly string[];
  readonly command?: string;
  readonly content?: string;
  readonly old_string?: string;
  readonly new_string?: string;
}

export interface NormalizedPreToolUseRequest {
  readonly shape: PayloadShape;
  readonly responseProfile: HookResponseProfile;
  readonly cwd?: string;
  readonly toolName: string;
  readonly toolInput: CanonicalPreToolUseInput;
  readonly inputTruncated: boolean;
}

export type PreToolUseNormalizationResult =
  | { readonly ok: true; readonly request: NormalizedPreToolUseRequest }
  | { readonly ok: false; readonly reason: string; readonly responseProfile?: HookResponseProfile };
