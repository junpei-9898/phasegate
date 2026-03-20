import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RenderCiTemplateUseCase } from '../../../ci-governance/application/usecases/render-ci-template-usecase.js';
import { TemplateGenerator } from '../../../ci-governance/domain/services/template-generator.js';

target('RenderCiTemplateUseCase', () => {
  describe('正常系', () => {
    // IT-UC-RenderCiTemplate-001
    describe('aidlc-gateテンプレートが正しいoutputPathで書き出されること', () => {
      context('TemplateRendererPort.render()が有効なOutputを返す場合', () => {
        it('outputPath=".github/workflows/aidlc-gate.yml"・errors=[]が返る', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = {
            render: vi.fn().mockResolvedValue({ outputPath: '.github/workflows/aidlc-gate.yml', content: 'yaml content' }),
          };
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          expect(actual.outputPath).toBe('.github/workflows/aidlc-gate.yml');
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-RenderCiTemplate-002
    describe('pre-commitテンプレートが正しいoutputPathで書き出されること', () => {
      context('TemplateRendererPort.render()が.husky/pre-commitのOutputを返す場合', () => {
        it('outputPath=".husky/pre-commit"が返る', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = {
            render: vi.fn().mockResolvedValue({ outputPath: '.husky/pre-commit', content: 'shell content' }),
          };
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'pre-commit' });
          expect(actual.outputPath).toBe('.husky/pre-commit');
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-RenderCiTemplate-003
    describe('CiTemplate.validate()に失敗した場合はTemplateRendererPortを呼び出さないこと', () => {
      context('ValidatorIdRegistryPort.listAll()→[]でINV-2違反になる場合', () => {
        it('TemplateRendererPort.render()が呼び出されず・errors[]にバリデーションエラーが含まれる', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue([]) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = { render: vi.fn() };
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          expect(rendererPort.render).not.toHaveBeenCalled();
          expect(actual.errors.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
