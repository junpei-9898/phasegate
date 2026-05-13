// @unit ci-governance
// @layer integration
// @work-item-id WI-174
// @story H13-03

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentsMdFileAdapter } from '../../../ci-governance/infrastructure/adapters/agents-md-file-adapter.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';
import { PointerEntry } from '../../../ci-governance/domain/value-objects/pointer-entry.js';
import { target } from '../../helpers/test-helpers.js';

let tmpDir: string | null = null;

async function refreshLessonPointersInExistingAgentsMd(): Promise<string> {
  tmpDir = await mkdtemp(join(tmpdir(), 'agents-md-section-'));
  const agentsMdPath = join(tmpDir, 'AGENTS.md');
  await writeFile(
    agentsMdPath,
    [
      '# AGENTS.md',
      '',
      '<!-- phasegate:managed-section:start -->',
      '## PhaseGate Managed Instructions',
      '<!-- phasegate:managed-section:end -->',
      '',
      'user note',
      '',
    ].join('\n'),
    'utf-8',
  );
  const adapter = new AgentsMdFileAdapter(tmpDir);
  const pointers = AgentsMdPointer.create([
    PointerEntry.createCommand({ key: 'cmd-1', command: 'phasegate:status', description: 'ステータス確認' }),
  ]);
  await adapter.read();
  await adapter.write(pointers);
  return await readFile(agentsMdPath, 'utf-8');
}

afterEach(async () => {
  if (tmpDir !== null) await rm(tmpDir, { recursive: true, force: true });
  tmpDir = null;
});

target('AgentsMdFileAdapter lesson pointer section', () => {
  describe('AGENTS.md の標準 managed section と lesson pointer section を共存させる', () => {
    it('lesson pointers sectionだけを更新して既存の標準運用ルールを保持する', async () => {
      // Act
      const actual = await refreshLessonPointersInExistingAgentsMd();

      // Assert
      expect(actual).toContain('PhaseGate Managed Instructions');
      expect(actual).toContain('user note');
      expect(actual).toContain('<!-- phasegate:lesson-pointers:start -->');
      expect(actual).toContain('[cmd:cmd-1](phasegate:status)');
    });
  });
});
