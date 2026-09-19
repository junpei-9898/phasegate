// @story H11-03
// @unit agent-integration
// @layer test
// @work-item-id WI-220
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizePostToolUse, renderPostToolUseFeedback } from '../../../agent-integration/presentation/post-tool-use-feedback.js';

describe('編集後の対象解釈', () => {
  it.each([
    { tool_name: 'Write', tool_input: { file_path: 'a.ts' } },
    { toolName: 'write_to_file', toolInput: { TargetFile: 'a.ts' } },
    { toolCall: { name: 'write_to_file', args: { TargetFile: 'a.ts' } } },
  ])('対応する入力形式から同じ編集対象を解決すること', (payload) => {
    const cwd = resolve('fixture');
    const actual = normalizePostToolUse({ ...payload, cwd }, process.cwd());
    expect(actual).toEqual({ toolName: 'Write', cwd, targets: [resolve(cwd, 'a.ts')] });
  });

  it('複数patchの全対象を重複なく保持すること', () => {
    const cwd = resolve('fixture');
    const actual = normalizePostToolUse({ cwd, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: a.ts\n@@\n-old\n+new\n*** Add File: b.ts\n+new\n*** End Patch' } }, cwd);
    expect(actual.targets).toEqual([resolve(cwd, 'a.ts'), resolve(cwd, 'b.ts')]);
  });

  it.each([
    '*** Begin Patch\n*** Update File: a.ts\n',
    '*** Begin Patch\n*** Update File: a.ts\n*** End Patch\n*** Begin Patch\n*** Update File: b.ts\n',
  ])('不完全patchでは一部の対象だけを検証しないこと', (command) => {
    const actual = normalizePostToolUse({ tool_name: 'apply_patch', tool_input: { command } }, process.cwd());
    expect(actual.targets).toEqual([]);
  });

  it.each(['Bash', 'exec_command', 'unknown', 'Read', 'Glob', 'Grep'])('対象を確定しない%sを部分的なパスで狭めないこと', (toolName) => {
    const actual = normalizePostToolUse({ tool_name: toolName, tool_input: { file_path: 'a.ts', command: 'touch a.ts; custom-generator' } }, process.cwd());
    expect(actual.targets).toEqual([]);
    expect(actual.toolName).toBe(toolName);
  });
});

describe('編集後の診断と復旧', () => {
  it('タイムアウトを検証成功とせず手動検証を案内すること', () => {
    const actual = renderPostToolUseFeedback({ executed: false, skipReason: 'TIMEOUT_EXCEEDED' });
    expect(actual).toEqual({ exitCode: 0, text: '検証未完了: TIMEOUT_EXCEEDED。自動再試行はしません。必要なタイミングで phasegate lint を実行してください。\n' });
  });
  it('lint失敗の本文を表示し編集後に新たな拒否を作らないこと', () => {
    const actual = renderPostToolUseFeedback({ executed: true, cliResult: { exitCode: 1, stdout: 'L1-001: detail', stderr: 'warning', timedOut: false } });
    expect(actual.exitCode).toBe(0);
    expect(actual.text).toContain('L1-001: detail');
    expect(actual.text).toContain('warning');
  });
  it.each(['HOOK_DISABLED', 'READ_ONLY'] as const)('正常な%sは無出力で終了すること', (skipReason) => {
    expect(renderPostToolUseFeedback({ executed: false, skipReason })).toEqual({ exitCode: 0, text: '' });
  });
});

it.each([true, false])('実hookが旧有効設定 %s と複数編集の報告範囲を守ること', async (enabled) => {
  // Arrange
  const packageRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'phasegate-post-targets-'));
  try {
    const cwd = join(directory, 'scripts/harness/sample');
    await mkdir(cwd, { recursive: true });
    await writeFile(join(directory, 'phasegate.config.json'), JSON.stringify({ project: { name: 'post-test', preset: 'standard' }, harnesses: { cascadeUpdate: enabled } }));
    await symlink(join(packageRoot, 'node_modules'), join(directory, 'node_modules'), 'dir');
    for (const name of ['a.ts', 'b.ts', 'c.ts']) await writeFile(join(cwd, name), 'export const value = 1;\n');
    const payload = { cwd, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: a.ts\n@@\n-old\n+new\n*** Update File: b.ts\n@@\n-old\n+new\n*** End Patch' } };

    // Act
    const actual = spawnSync(process.execPath, [
      '--import', join(packageRoot, 'node_modules/tsx/dist/loader.mjs'),
      join(packageRoot, 'scripts/harness/agent-integration/presentation/post-tool-use-hook.ts'),
    ], { cwd: packageRoot, input: JSON.stringify(payload), encoding: 'utf8', timeout: 15000, env: { ...process.env, npm_config_offline: 'true' } });

    // Assert
    expect(actual.error).toBeUndefined();
    expect(actual.status, actual.stderr).toBe(0);
    if (enabled) {
      expect(actual.stderr).toContain('Lint診断');
      expect(actual.stderr).toContain('a.ts');
      expect(actual.stderr).toContain('b.ts');
    } else {
      expect(actual.stderr).toBe('');
    }
    expect(actual.stderr).not.toContain('c.ts');
    expect(actual.stderr).not.toContain('TIMEOUT_EXCEEDED');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);
