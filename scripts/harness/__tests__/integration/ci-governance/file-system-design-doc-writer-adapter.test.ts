// @unit ci-governance
// @layer test
// @story H12-04

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { FileSystemDesignDocWriterAdapter } from '../../../ci-governance/infrastructure/adapters/file-system-design-doc-writer-adapter.js';
import { DesignPhase } from '../../../ci-governance/domain/value-objects/design-phase.js';

target('FileSystemDesignDocWriterAdapter', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phasegate-writer-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe('write / exists', () => {
    context('新規書き込み（親ディレクトリ不存在）', () => {
      it('IT-CG-FSDW-001: mkdir -p 相当で親を作って書き込む', async () => {
        const sut = new FileSystemDesignDocWriterAdapter(projectRoot);
        const phase = DesignPhase.create('logical');

        expect(await sut.exists('new-unit', phase)).toBe(false);
        const written = await sut.write('new-unit', phase, 'body');

        expect(written).toBe(
          path.join(projectRoot, 'docs/product/construction/new-unit/logical_design.md'),
        );
        expect(await sut.exists('new-unit', phase)).toBe(true);
        const content = await fs.readFile(written, 'utf-8');
        expect(content).toBe('body');
      });
    });

    context('既存ファイルありの上書き', () => {
      it('IT-CG-FSDW-002: write は内容を上書きする', async () => {
        const sut = new FileSystemDesignDocWriterAdapter(projectRoot);
        const phase = DesignPhase.create('domain');

        await sut.write('u1', phase, 'first');
        const second = await sut.write('u1', phase, 'second');

        expect(await fs.readFile(second, 'utf-8')).toBe('second');
      });
    });
  });

  describe('resolvePath', () => {
    context('各 phase の出力パスを問い合わせた場合', () => {
      it('IT-CG-FSDW-003: 期待パスを返す', () => {
        const sut = new FileSystemDesignDocWriterAdapter(projectRoot);

        expect(sut.resolvePath('u', DesignPhase.create('logical'))).toBe(
          path.join(projectRoot, 'docs/product/construction/u/logical_design.md'),
        );
        expect(sut.resolvePath('u', DesignPhase.create('unit-test'))).toBe(
          path.join(projectRoot, 'docs/product/construction/u/unit_test_design.md'),
        );
      });
    });
  });
});
