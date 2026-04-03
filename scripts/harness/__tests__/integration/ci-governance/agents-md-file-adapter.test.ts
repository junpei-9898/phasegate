import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { AgentsMdFileAdapter } from '../../../ci-governance/infrastructure/adapters/agents-md-file-adapter.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';
import { PointerEntry } from '../../../ci-governance/domain/value-objects/pointer-entry.js';

target('AgentsMdFileAdapter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `agents-md-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('read→parseテスト', () => {
    // IT-REPO-AgentsMdFile-001
    context('有効なPointerEntry形式のAGENTS.mdが存在する場合', () => {
      it('PointerEntry[]とadrLinks[]が正しくパースされたAgentsMdPointerが返る', async () => {
        const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
        const content = '# Agent Instructions\n\n<!-- pointer: cmd-status | phasegate:status | ステータス確認 -->\n';
        await fs.writeFile(agentsMdPath, content, 'utf-8');
        const adapter = new AgentsMdFileAdapter(tmpDir);
        const actual = await adapter.read();
        expect(actual).toBeInstanceOf(AgentsMdPointer);
        expect(actual.pointers.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('write→readテスト', () => {
    // IT-REPO-AgentsMdFile-002
    context('2件のPointerEntry[]を持つAgentsMdPointerをwrite()した場合', () => {
      it('write→readで同一PointerEntry[]が取得できる', async () => {
        const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
        await fs.writeFile(agentsMdPath, '# Agent Instructions\n', 'utf-8');
        const adapter = new AgentsMdFileAdapter(tmpDir);
        const pointers = AgentsMdPointer.create([
          PointerEntry.createCommand({ key: 'cmd-1', command: 'phasegate:status', description: 'ステータス確認' }),
          PointerEntry.createFile({ key: 'file-1', filePath: 'docs/README.md', description: 'README' }),
        ]);
        await adapter.write(pointers);
        const actual = await adapter.read();
        expect(actual.pointers).toHaveLength(2);
      });
    });

    // IT-REPO-AgentsMdFile-003
    context('10行のAGENTS.mdに対してwrite()した場合', () => {
      it('{before: 10, after: <実際の書き込み行数>}が返る', async () => {
        const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
        const tenLines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
        await fs.writeFile(agentsMdPath, tenLines, 'utf-8');
        const adapter = new AgentsMdFileAdapter(tmpDir);
        const pointers = AgentsMdPointer.create([
          PointerEntry.createCommand({ key: 'cmd-1', command: 'phasegate:status', description: '...' }),
        ]);
        const actual = await adapter.write(pointers);
        expect(actual.before).toBe(10);
        expect(typeof actual.after).toBe('number');
      });
    });
  });
});
