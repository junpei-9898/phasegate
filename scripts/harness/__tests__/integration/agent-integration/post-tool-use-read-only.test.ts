// @story H11-03
// @unit agent-integration
// @layer test
// @work-item-id WI-220
import { describe, expect, it, vi } from 'vitest';
import { HandlePostToolUseUseCase } from '../../../agent-integration/application/usecases/handle-post-tool-use-usecase.js';
import { HarnessConfigConfigQueryAdapter } from '../../../agent-integration/infrastructure/adapters/harness-config-config-query-adapter.js';

describe('編集後検証の読取り除外', () => {
  it.each([
    { toolName: 'Read', affectedFilePaths: [], readOnly: true },
    { toolName: 'Glob', affectedFilePaths: [], readOnly: true },
    { toolName: 'Grep', affectedFilePaths: [], readOnly: true },
    { toolName: 'Bash', affectedFilePaths: [], readOnly: false },
    { toolName: 'exec_command', affectedFilePaths: [], readOnly: false },
    { toolName: 'unknown', affectedFilePaths: [], readOnly: false },
    { toolName: 'Read', affectedFilePaths: ['changed.ts'], readOnly: false },
  ])('$toolNameの対象$affectedFilePathsに対して読取り判定$readOnlyを守る', async ({ toolName, affectedFilePaths, readOnly }) => {
    // Arrange
    const config = new HarnessConfigConfigQueryAdapter('unused-config.json');
    vi.spyOn(config, 'isHookEnabled').mockResolvedValue(true);
    const execute = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false });
    const usecase = new HandlePostToolUseUseCase({
      configQueryPort: config,
      cliExecutorPort: { execute },
      cliCommandRegistryPort: { hasCommand: async () => true, listCommands: async () => [] },
    });
    // Act
    const actual = await usecase.execute({ toolName, affectedFilePaths });
    // Assert
    expect(actual.executed).toBe(!readOnly);
    if (readOnly) {
      expect(actual.skipReason).toBe('READ_ONLY');
      expect(execute).not.toHaveBeenCalled();
      expect(config.isHookEnabled).not.toHaveBeenCalled();
    } else {
      expect(actual.cliResult?.exitCode).toBe(0);
      expect(execute).toHaveBeenCalledOnce();
      expect(execute).toHaveBeenCalledWith('phasegate:lint', affectedFilePaths.flatMap((target) => ['--target', target]), 5000);
    }
  });
});
