// @story H11-03
// @unit agent-integration
// @layer test
// @work-item-id WI-220
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { ChildProcessCliExecutorAdapter } from '../../../agent-integration/infrastructure/adapters/child-process-cli-executor-adapter.js';
import { TimeoutError } from '../../../agent-integration/application/ports/cli-executor-port.js';

it('引数を評価せず渡し標準入力の終了と作業ディレクトリを維持すること', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'phasegate-cli-lifecycle-'));
  try {
    const script = join(directory, 'observe.mjs');
    await writeFile(script, 'for await (const chunk of process.stdin) {}\nconsole.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));\nprocess.exitCode=7;\n');
    const adapter = new ChildProcessCliExecutorAdapter({ cwd: directory });

    // Act
    const actual = await adapter.execute(script, ['a b', '$(no-shell)', '--literal'], 3000);

    // Assert
    expect(actual.exitCode).toBe(7);
    expect(JSON.parse(actual.stdout)).toEqual({ args: ['a b', '$(no-shell)', '--literal'], cwd: await realpath(directory) });
    expect(actual.timedOut).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.skipIf(process.platform === 'win32')('タイムアウトで終了要求を無視する子孫も回収すること', async () => {
  // Arrange
  const directory = await mkdtemp(join(tmpdir(), 'phasegate-cli-timeout-'));
  const pidFile = join(directory, 'pids.json');
  let pids: number[] = [];
  const alive = (pid: number) => {
    try { process.kill(pid, 0); return true; } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
      throw error;
    }
  };
  try {
    const script = join(directory, 'hang.mjs');
    await writeFile(script, `import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
process.on('SIGTERM',()=>{});
const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});
writeFileSync(process.argv[2],JSON.stringify([process.pid,child.pid]));
setInterval(()=>{},1000);
`);
    const adapter = new ChildProcessCliExecutorAdapter();

    // Act
    const actual = await adapter.execute(script, [pidFile], 2500).catch((error: unknown) => error);

    // Assert
    expect(actual).toBeInstanceOf(TimeoutError);
    pids = JSON.parse(await readFile(pidFile, 'utf8'));
    expect(pids).toHaveLength(2);
    await expect.poll(() => pids.map(alive), { timeout: 2000 }).toEqual([false, false]);
  } finally {
    // Clean up only processes created by this fixture, including on the pre-fix RED run.
    if (pids.length === 0) {
      try { pids = JSON.parse(await readFile(pidFile, 'utf8')); } catch {}
    }
    for (const pid of pids) if (Number.isInteger(pid) && pid > 0 && alive(pid)) process.kill(pid, 'SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
}, 10000);
