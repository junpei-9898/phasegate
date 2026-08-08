/**
 * @unit agent-integration
 * @layer presentation
 * @work-item-id WI-385
 *
 * Runtime 固有の未信頼 payload を、agent 名に依存せず canonical input へ変換する。
 */

import type {
  CanonicalPreToolUseInput,
  HookResponseProfile,
  NormalizedPreToolUseRequest,
  PayloadShape,
  PreToolUseNormalizationResult,
} from "../application/dto/normalized-pre-tool-use-request.js";

type UnknownRecord = Record<string, unknown>;

const PATH_KEYS = ["file_path", "filePath", "TargetFile", "targetFile", "target_file", "path"] as const;
const CONTENT_KEYS = ["content", "CodeContent", "codeContent"] as const;
const OLD_CONTENT_KEYS = ["old_string", "oldString", "old_str", "oldContent", "OldContent"] as const;
const NEW_CONTENT_KEYS = ["new_string", "newString", "new_str", "newContent", "NewContent"] as const;
const COMMAND_KEYS = ["command", "CommandLine", "Command"] as const;

const DIRECT_WRITE_TOOLS = new Set(["Write", "write", "write_to_file"]);
const DIRECT_EDIT_TOOLS = new Set([
  "Edit",
  "search_replace",
  "hashline_edit",
  "replace_file_content",
  "multi_replace_file_content",
]);
const COMMAND_TOOLS = new Set(["Bash", "run_terminal_command", "run_command"]);

const PROFILE_BY_SHAPE: Readonly<Record<PayloadShape, HookResponseProfile>> = Object.freeze({
  FLAT_SNAKE_CASE: "LEGACY_EXIT_ONLY",
  FLAT_CAMEL_CASE: "COMPATIBILITY_DENY_ENVELOPE",
  NESTED_TOOL_CALL: "TOP_LEVEL_DENY_ENVELOPE",
});

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(record: UnknownRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function optionalString(record: UnknownRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function canonicalToolName(observedName: string): string {
  if (DIRECT_WRITE_TOOLS.has(observedName)) return "Write";
  if (DIRECT_EDIT_TOOLS.has(observedName)) return "Edit";
  if (COMMAND_TOOLS.has(observedName)) return "Bash";
  return observedName;
}

function canonicalDirectInput(toolInput: UnknownRecord): CanonicalPreToolUseInput {
  const filePath = nonEmptyString(toolInput, PATH_KEYS);
  const paths = Array.isArray(toolInput.paths)
    ? toolInput.paths.filter(
        (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0,
      )
    : undefined;
  const content = optionalString(toolInput, CONTENT_KEYS);
  const oldString = optionalString(toolInput, OLD_CONTENT_KEYS);
  const newString = optionalString(toolInput, NEW_CONTENT_KEYS);
  return {
    ...(filePath === undefined ? {} : { file_path: filePath }),
    ...(paths === undefined ? {} : { paths }),
    ...(content === undefined ? {} : { content }),
    ...(oldString === undefined ? {} : { old_string: oldString }),
    ...(newString === undefined ? {} : { new_string: newString }),
  };
}

function canonicalLegacyInput(toolInput: UnknownRecord): CanonicalPreToolUseInput {
  const paths = Array.isArray(toolInput.paths)
    ? toolInput.paths.filter((candidate): candidate is string => typeof candidate === "string")
    : undefined;
  const oldString = optionalString(toolInput, ["old_string", "old_str"]);
  const newString = optionalString(toolInput, ["new_string", "new_str"]);
  return {
    ...(typeof toolInput.path === "string" ? { path: toolInput.path } : {}),
    ...(typeof toolInput.file_path === "string" ? { file_path: toolInput.file_path } : {}),
    ...(paths === undefined ? {} : { paths }),
    ...(typeof toolInput.command === "string" ? { command: toolInput.command } : {}),
    ...(typeof toolInput.content === "string" ? { content: toolInput.content } : {}),
    ...(oldString === undefined ? {} : { old_string: oldString }),
    ...(newString === undefined ? {} : { new_string: newString }),
  };
}

function extractionFailure(
  profile: HookResponseProfile,
  observedName: string,
  expected: "path" | "command" | "patch",
): PreToolUseNormalizationResult {
  const candidates =
    expected === "path" ? PATH_KEYS.join(", ") : expected === "command" ? COMMAND_KEYS.join(", ") : "patch, command";
  return {
    ok: false,
    responseProfile: profile,
    reason: `${observedName} の書き込み対象を抽出できませんでした。受理可能な ${expected} key: ${candidates}`,
  };
}

function normalizeKnownInput(
  observedName: string,
  toolInput: UnknownRecord,
  profile: HookResponseProfile,
  inputTruncated: boolean,
  shape: PayloadShape,
): { readonly toolName: string; readonly toolInput: CanonicalPreToolUseInput } | PreToolUseNormalizationResult {
  if (observedName === "apply_patch") {
    if (inputTruncated) {
      return { ok: false, responseProfile: profile, reason: "切り詰められた apply_patch は全対象を保証できません" };
    }
    const patch =
      shape === "FLAT_SNAKE_CASE"
        ? nonEmptyString(toolInput, ["command"])
        : nonEmptyString(toolInput, ["patch", "command"]);
    if (patch === undefined) return extractionFailure(profile, observedName, "patch");
    return { toolName: "apply_patch", toolInput: { command: patch } };
  }

  if (COMMAND_TOOLS.has(observedName)) {
    if (inputTruncated) {
      return { ok: false, responseProfile: profile, reason: "切り詰められた command は全対象を保証できません" };
    }
    const command = nonEmptyString(toolInput, COMMAND_KEYS);
    if (command === undefined) return extractionFailure(profile, observedName, "command");
    return { toolName: "Bash", toolInput: { command } };
  }

  if (DIRECT_WRITE_TOOLS.has(observedName) || DIRECT_EDIT_TOOLS.has(observedName)) {
    const directInput = canonicalDirectInput(toolInput);
    if (directInput.file_path === undefined && (directInput.paths === undefined || directInput.paths.length === 0))
      return extractionFailure(profile, observedName, "path");
    return { toolName: canonicalToolName(observedName), toolInput: directInput };
  }

  return { toolName: canonicalToolName(observedName), toolInput: canonicalLegacyInput(toolInput) };
}

export class PreToolUsePayloadNormalizer {
  normalize(payload: unknown): PreToolUseNormalizationResult {
    if (!isRecord(payload)) return { ok: false, reason: "PreToolUse payload は JSON object である必要があります" };

    const toolCall = isRecord(payload.toolCall) ? payload.toolCall : undefined;
    const shapes: PayloadShape[] = [];
    if (typeof payload.tool_name === "string") shapes.push("FLAT_SNAKE_CASE");
    if (typeof payload.toolName === "string" && isRecord(payload.toolInput)) shapes.push("FLAT_CAMEL_CASE");
    if (toolCall !== undefined && typeof toolCall.name === "string" && isRecord(toolCall.args)) {
      shapes.push("NESTED_TOOL_CALL");
    }

    if (shapes.length === 0) {
      if ("hook_event_name" in payload || "session_id" in payload || "tool_input" in payload) {
        return {
          ok: false,
          responseProfile: "LEGACY_EXIT_ONLY",
          reason: "tool_nameフィールドが必要です",
        };
      }
      if (toolCall !== undefined) {
        return {
          ok: false,
          responseProfile: "TOP_LEVEL_DENY_ENVELOPE",
          reason: "toolCall payload の name と args を検出できないため拒否しました",
        };
      }
      return { ok: false, reason: "対応する PreToolUse payload shape を検出できませんでした" };
    }
    if (shapes.length > 1)
      return { ok: false, reason: "複数の PreToolUse payload shape が混在しているため拒否しました" };

    const shape = shapes[0];
    const responseProfile = PROFILE_BY_SHAPE[shape];
    const observedName =
      shape === "FLAT_SNAKE_CASE"
        ? (payload.tool_name as string)
        : shape === "FLAT_CAMEL_CASE"
          ? (payload.toolName as string)
          : (toolCall?.name as string);
    const toolInput =
      shape === "FLAT_SNAKE_CASE"
        ? isRecord(payload.tool_input)
          ? payload.tool_input
          : {}
        : shape === "FLAT_CAMEL_CASE"
          ? (payload.toolInput as UnknownRecord)
          : (toolCall?.args as UnknownRecord);
    const inputTruncated = payload.toolInputTruncated === true;
    const normalizedInput = normalizeKnownInput(observedName, toolInput, responseProfile, inputTruncated, shape);
    if ("ok" in normalizedInput) return normalizedInput;

    const cwd =
      shape === "NESTED_TOOL_CALL"
        ? Array.isArray(payload.workspacePaths)
          ? payload.workspacePaths.find(
              (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
            )
          : undefined
        : typeof payload.cwd === "string"
          ? payload.cwd
          : undefined;
    const request: NormalizedPreToolUseRequest = {
      shape,
      responseProfile,
      cwd,
      toolName: normalizedInput.toolName,
      toolInput: normalizedInput.toolInput,
      inputTruncated,
    };
    return { ok: true, request };
  }
}
