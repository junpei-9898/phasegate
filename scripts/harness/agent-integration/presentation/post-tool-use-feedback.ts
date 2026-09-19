// @unit agent-integration
// @layer presentation
// @work-item-id WI-220
import { resolve } from 'node:path';
import type { HandlePostToolUseOutput } from '../application/dto/handle-post-tool-use-dto.js';
import { ApplyPatchWriteTargetExtractor } from '../domain/services/apply-patch-write-target-extractor.js';
import { PreToolUsePayloadNormalizer } from './pre-tool-use-payload-normalizer.js';

export function normalizePostToolUse(payload: unknown, processCwd: string): { toolName?: string; cwd: string; targets: string[] } {
  const record = payload !== null && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const cwd = resolve(typeof record.cwd === 'string' ? record.cwd : processCwd);
  const normalized = new PreToolUsePayloadNormalizer().normalize(payload);
  if (!normalized.ok) {
    // An incomplete known invocation still receives full lint, never a partial target scope.
    const named = typeof record.tool_name === 'string' || typeof record.toolName === 'string' || record.toolCall !== undefined;
    return { toolName: named ? 'unknown' : undefined, cwd, targets: [] };
  }
  const { toolName, toolInput, inputTruncated } = normalized.request;
  let targets: readonly string[] = [];
  if (!inputTruncated && ['Write', 'Edit', 'NotebookEdit', 'str_replace_editor'].includes(toolName)) {
    targets = [toolInput.file_path, toolInput.path, ...(toolInput.paths ?? [])].filter((p): p is string => typeof p === 'string' && p.length > 0);
  } else if (!inputTruncated && toolName === 'apply_patch' && toolInput.command?.trimEnd().endsWith('*** End Patch')
    && (toolInput.command.match(/^\*\*\* Begin Patch\s*$/gm)?.length ?? 0) === (toolInput.command.match(/^\*\*\* End Patch\s*$/gm)?.length ?? 0)) {
    targets = new ApplyPatchWriteTargetExtractor().extract(toolInput.command).map((target) => target.filePath);
  }
  return { toolName, cwd, targets: [...new Set(targets.map((target) => resolve(cwd, target)))] };
}

export function renderPostToolUseFeedback(output: HandlePostToolUseOutput): { exitCode: number; text: string } {
  if (output.skipReason === 'TIMEOUT_EXCEEDED') {
    return { exitCode: 0, text: '検証未完了: TIMEOUT_EXCEEDED。自動再試行はしません。必要なタイミングで phasegate lint を実行してください。\n' };
  }
  if (output.skipReason === 'READ_ONLY' || output.skipReason === 'HOOK_DISABLED') return { exitCode: 0, text: '' };
  if (output.skipReason) return { exitCode: 0, text: `スキップ: ${output.skipReason}\n` };
  if (output.cliResult && output.cliResult.exitCode !== 0) {
    return { exitCode: 0, text: `Lint診断 (exitCode=${output.cliResult.exitCode}):\n${output.cliResult.stdout}\n${output.cliResult.stderr}\n` };
  }
  return { exitCode: 0, text: output.cliResult?.stderr ?? '' };
}
