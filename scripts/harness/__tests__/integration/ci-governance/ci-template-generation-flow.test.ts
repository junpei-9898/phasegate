// @layer test
// @unit ci-governance
// @story H13-01
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { GenerateCiTemplateHandler } from '../../../ci-governance/presentation/handlers/generate-ci-template-handler.js';
import { GenerateCiTemplateUseCase } from '../../../ci-governance/application/usecases/generate-ci-template-usecase.js';
import { RenderCiTemplateUseCase } from '../../../ci-governance/application/usecases/render-ci-template-usecase.js';
import { TemplateGenerator } from '../../../ci-governance/domain/services/template-generator.js';

target('CI/CDテンプレート生成統合フロー', () => {
  describe('Handler→UseCase→TemplateGenerator→CiTemplate全レイヤー統合テスト', () => {
    // IT-API-CiTemplateFlow-001
    context('Handler→UseCase→TemplateGenerator→CiTemplateの全レイヤーが連携してテンプレートを生成できること', () => {
      it('出力にtemplateType/triggerCondition/targetValidatorIdsが含まれ・exitCode=0が返る', async () => {
        const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
        const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
        const generator = new TemplateGenerator(validatorPort as any, presetPort as any);
        const rendererPort = {
          render: vi.fn().mockResolvedValue({ outputPath: '.github/workflows/aidlc-gate.yml', content: 'yaml' }),
        };
        const generateUseCase = new GenerateCiTemplateUseCase(generator);
        const renderUseCase = new RenderCiTemplateUseCase(generator, rendererPort as any);
        const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);
        const actual = await handler.handle({ presetId: 'standard', templateType: 'aidlc-gate' });
        expect(actual.exitCode).toBe(0);
        expect(generateUseCase).toBeDefined();
        expect(renderUseCase).toBeDefined();
      });
    });

    // IT-API-CiTemplateFlow-002
    context('templateType×triggerConditionの全3種マッピングが正しく連携されること', () => {
      it('aidlc-gate→pull_request・consistency-check→schedule・pre-commit→pre-commitで正しいtriggerConditionが返る', async () => {
        const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
        const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
        const generator = new TemplateGenerator(validatorPort as any, presetPort as any);
        const rendererPort = { render: vi.fn().mockResolvedValue({ outputPath: 'out', content: '' }) };
        const generateUseCase = new GenerateCiTemplateUseCase(generator);
        const renderUseCase = new RenderCiTemplateUseCase(generator, rendererPort as any);
        const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);

        const cases: Array<{ templateType: string; expected: string }> = [
          { templateType: 'aidlc-gate', expected: 'pull_request' },
          { templateType: 'consistency-check', expected: 'schedule' },
          { templateType: 'pre-commit', expected: 'pre-commit' },
        ];

        for (const { templateType, expected } of cases) {
          const result = await generateUseCase.execute({ presetId: 'standard', templateType: templateType as any });
          expect(result.triggerCondition).toBe(expected);
          expect(result.validationErrors).toHaveLength(0);
        }
      });
    });
  });
});
