// @unit ci-governance
// @layer test
// @story H12-04

import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ScaffoldDesignUseCase } from '../../../ci-governance/application/usecases/scaffold-design-usecase.js';
import type { TemplateRepositoryPort } from '../../../ci-governance/domain/ports/template-repository-port.js';
import type { DesignDocWriterPort } from '../../../ci-governance/domain/ports/design-doc-writer-port.js';
import { DesignPhase } from '../../../ci-governance/domain/value-objects/design-phase.js';

function makeTemplates(content: string): TemplateRepositoryPort {
  return {
    read: vi.fn(async () => content),
    resolvePath: vi.fn((p: DesignPhase) => `/tpl/${p.templateFileName}`),
  };
}

function makeWriter(overrides?: Partial<DesignDocWriterPort>): DesignDocWriterPort {
  return {
    resolvePath: vi.fn((unit: string, p: DesignPhase) => `/out/${unit}/${p.designDocFileName}`),
    exists: vi.fn(async () => false),
    write: vi.fn(async (unit: string, p: DesignPhase) => `/out/${unit}/${p.designDocFileName}`),
    ...overrides,
  };
}

target('ScaffoldDesignUseCase', () => {
  describe('正常系', () => {
    context('既存ファイルなし & logical phase', () => {
      it('IT-CG-SD-001: テンプレを読んで書き込み、written=true を返す', async () => {
        const tpl = makeTemplates('# logical for {{unit}}');
        const writer = makeWriter();
        const sut = new ScaffoldDesignUseCase(tpl, writer);

        const result = await sut.execute({ unit: 'demo', phase: 'logical' });

        expect(result.written).toBe(true);
        expect(result.alreadyExists).toBe(false);
        expect(result.overwritten).toBe(false);
        expect(result.targetPath).toBe('/out/demo/logical_design.md');
        expect(result.templatePath).toBe('/tpl/logical_design.template.md');
        expect(writer.write).toHaveBeenCalledTimes(1);
        const writtenContent = (writer.write as unknown as {
          mock: { calls: unknown[][] };
        }).mock.calls[0][2] as string;
        expect(writtenContent).toBe('# logical for demo');
      });
    });

    context('既存ファイルあり & force=true', () => {
      it('IT-CG-SD-002: 上書きし overwritten=true を返す', async () => {
        const tpl = makeTemplates('x');
        const writer = makeWriter({ exists: vi.fn(async () => true) });
        const sut = new ScaffoldDesignUseCase(tpl, writer);

        const result = await sut.execute({ unit: 'demo', phase: 'logical', force: true });

        expect(result.written).toBe(true);
        expect(result.alreadyExists).toBe(true);
        expect(result.overwritten).toBe(true);
        expect(writer.write).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('保護挙動', () => {
    context('既存ファイルあり & force=false', () => {
      it('IT-CG-SD-003: 書き込みをスキップし alreadyExists=true, written=false を返す', async () => {
        const tpl = makeTemplates('x');
        const writer = makeWriter({ exists: vi.fn(async () => true) });
        const sut = new ScaffoldDesignUseCase(tpl, writer);

        const result = await sut.execute({ unit: 'demo', phase: 'logical' });

        expect(result.written).toBe(false);
        expect(result.alreadyExists).toBe(true);
        expect(writer.write).not.toHaveBeenCalled();
        expect(tpl.read).not.toHaveBeenCalled();
      });
    });
  });

  describe('入力検証', () => {
    context('unit が空文字', () => {
      it('IT-CG-SD-004: 例外を投げる', async () => {
        const tpl = makeTemplates('x');
        const writer = makeWriter();
        const sut = new ScaffoldDesignUseCase(tpl, writer);

        await expect(sut.execute({ unit: '', phase: 'logical' })).rejects.toThrow(/--unit/);
      });
    });

    context('phase が未知値', () => {
      it('IT-CG-SD-005: 例外を投げる', async () => {
        const tpl = makeTemplates('x');
        const writer = makeWriter();
        const sut = new ScaffoldDesignUseCase(tpl, writer);

        await expect(sut.execute({ unit: 'demo', phase: 'invalid' })).rejects.toThrow(/未知の設計 phase/);
      });
    });
  });

  describe('プレースホルダ置換', () => {
    context('テンプレに {{unit}} 含むケース', () => {
      it('IT-CG-SD-006: 全 {{unit}} 出現が unit 値に置換される', async () => {
        const tpl = makeTemplates('A {{unit}} B {{ unit }} C');
        const writer = makeWriter();
        const sut = new ScaffoldDesignUseCase(tpl, writer);

        await sut.execute({ unit: 'my-unit', phase: 'logical' });

        const written = (writer.write as unknown as {
          mock: { calls: unknown[][] };
        }).mock.calls[0][2] as string;
        expect(written).toBe('A my-unit B my-unit C');
      });
    });
  });
});
