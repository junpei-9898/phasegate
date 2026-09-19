// @story H01-01
// @unit biome-ast-engine
// @layer integration-test
// @work-item-id WI-220
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BiomeCliExecutorAdapter } from '../../../biome-ast-engine/infrastructure/adapters/biome-cli-executor-adapter.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));

describe.skipIf(process.platform === 'win32')('インストール済みBiomeの起動経路', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'local-biome-'));
    vi.mocked(spawnSync).mockReset();
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as never);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  function bin(directory: string, executable = true) {
    const file = join(directory, 'node_modules/.bin/biome');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, '#!/bin/sh\nexit 0\n');
    chmodSync(file, executable ? 0o755 : 0o644);
    return file;
  }

  it('近いローカルbinを選び同じ対象と検査引数を渡すこと', async () => {
    bin(root);
    const cwd = join(root, 'workspace');
    const expectedBin = bin(cwd);
    const adapter = new BiomeCliExecutorAdapter({ cwd });
    const actual = await adapter.executeCheck([FilePath.fromWorkspaceRelative('src/a.ts')]);
    expect(actual).toBeUndefined();
    expect(spawnSync).toHaveBeenCalledExactlyOnceWith(expectedBin, ['check', '--reporter', 'json', 'src/a.ts'], { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  });

  it('作業directoryにない場合は祖先の実行可能binを使うこと', async () => {
    const expectedBin = bin(root);
    const cwd = join(root, 'nested/workspace');
    mkdirSync(cwd, { recursive: true });
    const actual = await new BiomeCliExecutorAdapter({ cwd }).executeCheck([]);
    expect(actual).toBeUndefined();
    expect(spawnSync).toHaveBeenCalledWith(expectedBin, ['check', '--reporter', 'json'], expect.objectContaining({ cwd }));
  });

  it('実行できないローカルbinしかない場合は従来の探索へ戻ること', async () => {
    bin(root, false);
    const actual = await new BiomeCliExecutorAdapter({ cwd: root }).executeCheck([]);
    expect(actual).toBeUndefined();
    expect(spawnSync).toHaveBeenCalledWith('npx', ['biome', 'check', '--reporter', 'json'], expect.objectContaining({ cwd: root }));
  });

  it.each(['npx', '/custom/biome'])('明示された実行経路%sをローカルbinで置換しないこと', async (biomeBin) => {
    bin(root);
    const actual = await new BiomeCliExecutorAdapter({ cwd: root, biomeBin }).executeCheck([]);
    expect(actual).toBeUndefined();
    expect(spawnSync).toHaveBeenCalledWith(biomeBin, biomeBin === 'npx' ? ['biome', 'check', '--reporter', 'json'] : ['check', '--reporter', 'json'], expect.any(Object));
  });

  it.each([0, 1])('終了状態%sの既存成功扱いを維持すること', async (status) => {
    bin(root);
    vi.mocked(spawnSync).mockReturnValue({ status, stderr: 'native diagnostic' } as never);
    const actual = await new BiomeCliExecutorAdapter({ cwd: root }).executeCheck([]);
    expect(actual).toBeUndefined();
  });

  it('検査実行エラーの終了状態と診断を保持すること', async () => {
    bin(root);
    vi.mocked(spawnSync).mockReturnValue({ status: 2, stderr: 'native failure' } as never);
    const actual = new BiomeCliExecutorAdapter({ cwd: root }).executeCheck([]);
    await expect(actual).rejects.toMatchObject({ name: 'BiomeCliExecutionError', exitCode: 2, stderr: 'native failure' });
  });
});
