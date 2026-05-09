// @unit ci-governance
// @layer integration
// @story H12-04

import { describe, it, vi, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { target, context } from '../../helpers/test-helpers.js';
import { RenderCiTemplateUseCase } from '../../../ci-governance/application/usecases/render-ci-template-usecase.js';
import { TemplateGenerator } from '../../../ci-governance/domain/services/template-generator.js';
import { YamlTemplateRendererAdapter } from '../../../ci-governance/infrastructure/adapters/yaml-template-renderer-adapter.js';

target('RenderCiTemplateUseCase', () => {
  describe('正常系', () => {
    // IT-UC-RenderCiTemplate-001
    describe('aidlc-gateテンプレートが正しいoutputPathで書き出されること', () => {
      context('TemplateRendererPort.render()が有効なOutputを返す場合', () => {
        it('aidlc-gateのoutputPathと空のerrorsが返る', async () => {
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
        it('pre-commitのoutputPathが返る', async () => {
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

    // IT-UC-RenderCiTemplate-WI031-001
    describe('aidlc-gateテンプレートがbundled templateと一致すること', () => {
      context('実ファイルのYamlTemplateRendererAdapterでrenderする場合', () => {
        it('contentがdocs/templates/ci/aidlc-gate.ymlと一致する', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = new YamlTemplateRendererAdapter(process.cwd());
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          const expected = await readFile(join(process.cwd(), 'docs/templates/ci/aidlc-gate.yml'), 'utf-8');

          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });

          // Assert
          expect(actual.content).toBe(expected);
          expect(actual.outputPath).toBe('.github/workflows/aidlc-gate.yml');
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-RenderCiTemplate-WI031-002
    describe('consistency-checkテンプレートがbundled templateと一致すること', () => {
      context('実ファイルのYamlTemplateRendererAdapterでrenderする場合', () => {
        it('contentがdocs/templates/ci/consistency-check.ymlと一致しGitHub Issue作成logicを含む', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = new YamlTemplateRendererAdapter(process.cwd());
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          const expected = await readFile(join(process.cwd(), 'docs/templates/ci/consistency-check.yml'), 'utf-8');

          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'consistency-check' });

          // Assert
          expect(actual.content).toBe(expected);
          expect(actual.content).toContain('github.rest.issues.create');
          expect(actual.outputPath).toBe('.github/workflows/consistency-check.yml');
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-RenderCiTemplate-WI031-003
    describe('pre-commitテンプレートがbundled hookと一致すること', () => {
      context('実ファイルのYamlTemplateRendererAdapterでrenderする場合', () => {
        it('contentがdocs/templates/hooks/pre-commitと一致する', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = new YamlTemplateRendererAdapter(process.cwd());
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          const expected = await readFile(join(process.cwd(), 'docs/templates/hooks/pre-commit'), 'utf-8');

          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'pre-commit' });

          // Assert
          expect(actual.content).toBe(expected);
          expect(actual.outputPath).toBe('.husky/pre-commit');
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-RenderCiTemplate-WI032-001
    describe('agent-context-refreshテンプレートがbundled workflowと一致すること', () => {
      context('実ファイルのYamlTemplateRendererAdapterでrenderする場合', () => {
        it('contentがdocs/templates/ci/agent-context-refresh.ymlと一致する', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = new YamlTemplateRendererAdapter(process.cwd());
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          const expected = await readFile(join(process.cwd(), 'docs/templates/ci/agent-context-refresh.yml'), 'utf-8');

          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'agent-context-refresh' });

          // Assert
          expect(actual.content).toBe(expected);
          expect(actual.outputPath).toBe('.github/workflows/agent-context-refresh.yml');
          expect(actual.errors).toHaveLength(0);
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
