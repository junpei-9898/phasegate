// @unit ci-governance
// @layer test
// @story H12-04

import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ScaffoldDesignHandler } from '../../../ci-governance/presentation/handlers/scaffold-design-handler.js';
import { ScaffoldDesignUseCase } from '../../../ci-governance/application/usecases/scaffold-design-usecase.js';
import type { TemplateRepositoryPort } from '../../../ci-governance/domain/ports/template-repository-port.js';
import type { DesignDocWriterPort } from '../../../ci-governance/domain/ports/design-doc-writer-port.js';
import { DesignPhase } from '../../../ci-governance/domain/value-objects/design-phase.js';

function buildUseCase(overrides?: {
  exists?: boolean;
  content?: string;
}): {
  useCase: ScaffoldDesignUseCase;
  tpl: TemplateRepositoryPort;
  writer: DesignDocWriterPort;
} {
  const tpl: TemplateRepositoryPort = {
    read: vi.fn(async () => overrides?.content ?? '# {{unit}}'),
    resolvePath: vi.fn((p: DesignPhase) => `/tpl/${p.templateFileName}`),
  };
  const writer: DesignDocWriterPort = {
    resolvePath: vi.fn(
      (unit: string, p: DesignPhase) => `/out/${unit}/${p.designDocFileName}`,
    ),
    exists: vi.fn(async () => overrides?.exists === true),
    write: vi.fn(
      async (unit: string, p: DesignPhase) => `/out/${unit}/${p.designDocFileName}`,
    ),
  };
  return { useCase: new ScaffoldDesignUseCase(tpl, writer), tpl, writer };
}

target('ScaffoldDesignHandler', () => {
  describe('正常系', () => {
    context('--unit demo --phase logical, 既存なし', () => {
      it('IT-CG-SDH-001: exit=0, 人間向けメッセージにパス情報を含む', async () => {
        const { useCase } = buildUseCase();
        const handler = new ScaffoldDesignHandler(useCase);

        const result = await handler.handle({ unit: 'demo', phase: 'logical' });

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('設計文書を生成しました');
        expect(result.output).toContain('/out/demo/logical_design.md');
        expect(result.output).toContain('/tpl/logical_design.template.md');
      });
    });
  });

  describe('保護挙動', () => {
    context('既存ファイルあり & --force なし', () => {
      it('IT-CG-SDH-002: exit=2, 「既に存在します」を出力', async () => {
        const { useCase } = buildUseCase({ exists: true });
        const handler = new ScaffoldDesignHandler(useCase);

        const result = await handler.handle({ unit: 'demo', phase: 'logical' });

        expect(result.exitCode).toBe(2);
        expect(result.output).toContain('既に存在します');
        expect(result.output).toContain('--force');
      });
    });

    context('既存ファイルあり & --force あり', () => {
      it('IT-CG-SDH-003: exit=0, 上書き文言を出力', async () => {
        const { useCase } = buildUseCase({ exists: true });
        const handler = new ScaffoldDesignHandler(useCase);

        const result = await handler.handle({
          unit: 'demo',
          phase: 'logical',
          force: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('上書き保存しました');
      });
    });
  });

  describe('入力検証', () => {
    context('--unit が空', () => {
      it('IT-CG-SDH-004: exit=2 を返す', async () => {
        const { useCase } = buildUseCase();
        const handler = new ScaffoldDesignHandler(useCase);

        const result = await handler.handle({ unit: '', phase: 'logical' });

        expect(result.exitCode).toBe(2);
        expect(result.output).toContain('--unit');
      });
    });

    context('--phase が未知値', () => {
      it('IT-CG-SDH-005: exit=2、許容値の一覧を出力', async () => {
        const { useCase } = buildUseCase();
        const handler = new ScaffoldDesignHandler(useCase);

        const result = await handler.handle({ unit: 'demo', phase: 'invalid' });

        expect(result.exitCode).toBe(2);
        expect(result.output).toContain('未知の phase');
        expect(result.output).toContain('logical');
      });
    });
  });

  describe('JSON 出力', () => {
    context('--json 指定かつ正常', () => {
      it('IT-CG-SDH-006: パース可能な JSON を返す', async () => {
        const { useCase } = buildUseCase();
        const handler = new ScaffoldDesignHandler(useCase);

        const result = await handler.handle({
          unit: 'demo',
          phase: 'logical',
          format: 'json',
        });

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.output);
        expect(parsed.written).toBe(true);
        expect(parsed.phase).toBe('logical');
        expect(parsed.unit).toBe('demo');
      });
    });
  });
});
