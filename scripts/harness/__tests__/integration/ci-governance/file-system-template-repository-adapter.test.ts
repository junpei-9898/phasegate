// @unit ci-governance
// @layer test
// @story H12-04

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { FileSystemTemplateRepositoryAdapter } from '../../../ci-governance/infrastructure/adapters/file-system-template-repository-adapter.js';
import { DesignPhase } from '../../../ci-governance/domain/value-objects/design-phase.js';

target('FileSystemTemplateRepositoryAdapter', () => {
  let harnessRoot: string;

  beforeEach(async () => {
    harnessRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phasegate-tpl-'));
    await fs.mkdir(path.join(harnessRoot, 'templates'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(harnessRoot, { recursive: true, force: true });
  });

  describe('read / resolvePath', () => {
    context('テンプレートが存在する phase', () => {
      it('IT-CG-FSTR-001: 中身を読み取れる', async () => {
        const file = path.join(harnessRoot, 'templates/logical_design.template.md');
        await fs.writeFile(file, '# tpl body', 'utf-8');
        const sut = new FileSystemTemplateRepositoryAdapter(harnessRoot);

        const content = await sut.read(DesignPhase.create('logical'));

        expect(content).toBe('# tpl body');
        expect(sut.resolvePath(DesignPhase.create('logical'))).toBe(file);
      });
    });

    context('テンプレートが存在しない phase', () => {
      it('IT-CG-FSTR-002: ENOENT を親しみやすい例外に変換する', async () => {
        const sut = new FileSystemTemplateRepositoryAdapter(harnessRoot);

        await expect(sut.read(DesignPhase.create('domain'))).rejects.toThrow(
          /テンプレートが見つかりません/,
        );
      });
    });
  });
});
