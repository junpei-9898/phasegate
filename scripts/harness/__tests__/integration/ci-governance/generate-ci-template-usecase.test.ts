// @layer test
import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { GenerateCiTemplateUseCase } from '../../../ci-governance/application/usecases/generate-ci-template-usecase.js';
import { TemplateGenerator } from '../../../ci-governance/domain/services/template-generator.js';

target('GenerateCiTemplateUseCase', () => {
  describe('正常系', () => {
    // IT-UC-GenerateCiTemplate-001
    describe('aidlc-gateテンプレートをstandardプリセットで生成できること', () => {
      context('presetId="standard", templateType="aidlc-gate"で有効なデータが返る場合', () => {
        it('templateType・triggerCondition・targetValidatorIdsが含まれたOutputが返る', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          expect(actual.templateType).toBe('aidlc-gate');
          expect(actual.triggerCondition).toBe('pull_request');
          expect(actual.targetValidatorIds).toEqual(['v1', 'v2']);
          expect(actual.validationErrors).toHaveLength(0);
        });
      });
    });

    // IT-UC-GenerateCiTemplate-002
    describe('consistency-checkテンプレートをstrictプリセットで生成できること', () => {
      context('presetId="strict", templateType="consistency-check"でfailOnWarning=trueが返る場合', () => {
        it('triggerCondition="schedule"・failOnWarning=trueのOutputが返る', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2', 'v3']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: true }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          const actual = await useCase.execute({ presetId: 'strict', templateType: 'consistency-check' });
          expect(actual.triggerCondition).toBe('schedule');
          expect(actual.failOnWarning).toBe(true);
        });
      });
    });

    // IT-UC-GenerateCiTemplate-003
    describe('pre-commitテンプレートをminimalプリセットで生成できること', () => {
      context('presetId="minimal", templateType="pre-commit"で有効なデータが返る場合', () => {
        it('triggerCondition="pre-commit"・validationErrors=[]が返る', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          const actual = await useCase.execute({ presetId: 'minimal', templateType: 'pre-commit' });
          expect(actual.triggerCondition).toBe('pre-commit');
          expect(actual.validationErrors).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-GenerateCiTemplate-004
    describe('不正なtemplateTypeを入力した場合にエラーが返ること', () => {
      context('templateType="invalid"を渡した場合', () => {
        it('HarnessError[]が返る（INV-1違反）', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'invalid' as any });
          expect(actual.validationErrors.length).toBeGreaterThan(0);
        });
      });
    });

    // IT-UC-GenerateCiTemplate-005
    describe('PresetConfigPortがI/O失敗した場合にResult.failが返ること', () => {
      context('PresetConfigPort.getPreset()がエラーをスローする場合', () => {
        it('HarnessError[]を含むエラー出力が返る', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockRejectedValue(new Error('I/O error')) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          expect(actual.validationErrors.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('バリデーション', () => {
    // IT-UC-GenerateCiTemplate-006
    describe('ValidatorIdRegistryPortが空リストを返す場合にINV-2違反エラーが返ること', () => {
      context('ValidatorIdRegistryPort.listAll()→[]が返る場合', () => {
        it('validationErrorsにINV-2違反（CI_TEMPLATE_EMPTY_VALIDATORS）が含まれる', async () => {
          const validatorPort = { listAll: vi.fn().mockResolvedValue([]) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          const actual = await useCase.execute({ presetId: 'minimal', templateType: 'aidlc-gate' });
          expect(actual.validationErrors.some((e: any) => e.code.includes('EMPTY_VALIDATORS'))).toBe(true);
        });
      });
    });
  });
});
