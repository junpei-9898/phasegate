import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { GenerateCiTemplateHandler } from '../../../ci-governance/presentation/handlers/generate-ci-template-handler.js';

target('GenerateCiTemplateHandler', () => {
  describe('正常系', () => {
    // IT-API-GenerateCiTemplateHandler-001
    describe('干し実行（バリデーションエラーなし）でexitCode=0が返ること', () => {
      context('GenerateCiTemplateUseCase.execute()→validationErrors=[]が返る場合', () => {
        it('exitCode=0・GenerateCiTemplateUseCase.execute()が1回呼ばれる', async () => {
          const generateUseCase = {
            execute: vi.fn().mockResolvedValue({
              templateType: 'aidlc-gate',
              triggerCondition: 'pull_request',
              targetValidatorIds: ['v1'],
              failOnWarning: false,
              presetRef: 'standard',
              validationErrors: [],
            }),
          };
          const renderUseCase = { execute: vi.fn() };
          const handler = new GenerateCiTemplateHandler(generateUseCase as any, renderUseCase as any);
          const actual = await handler.handle({
            presetId: 'standard',
            templateType: 'aidlc-gate',
          });
          expect(actual.exitCode).toBe(0);
          expect(generateUseCase.execute).toHaveBeenCalledTimes(1);
        });
      });
    });

    // IT-API-GenerateCiTemplateHandler-002
    describe('format=jsonで出力がJSON形式になること', () => {
      context('format="json"を渡した場合', () => {
        it('stdout出力がJSONパース可能な文字列になる', async () => {
          const generateUseCase = {
            execute: vi.fn().mockResolvedValue({
              templateType: 'aidlc-gate',
              triggerCondition: 'pull_request',
              targetValidatorIds: ['v1'],
              failOnWarning: false,
              presetRef: 'standard',
              validationErrors: [],
            }),
          };
          const renderUseCase = { execute: vi.fn() };
          const handler = new GenerateCiTemplateHandler(generateUseCase as any, renderUseCase as any);
          const actual = await handler.handle({
            presetId: 'standard',
            templateType: 'pre-commit',
            format: 'json',
          });
          expect(() => JSON.parse(actual.output)).not.toThrow();
        });
      });
    });

    // IT-API-GenerateCiTemplateHandler-003
    describe('consistency-checkでtriggerCondition=scheduleが含まれること', () => {
      context('templateType="consistency-check"で実行した場合', () => {
        it('exitCode=0が返る', async () => {
          const generateUseCase = {
            execute: vi.fn().mockResolvedValue({
              templateType: 'consistency-check',
              triggerCondition: 'schedule',
              targetValidatorIds: ['v1', 'v2'],
              failOnWarning: true,
              presetRef: 'strict',
              validationErrors: [],
            }),
          };
          const renderUseCase = { execute: vi.fn() };
          const handler = new GenerateCiTemplateHandler(generateUseCase as any, renderUseCase as any);
          const actual = await handler.handle({
            presetId: 'strict',
            templateType: 'consistency-check',
          });
          expect(actual.exitCode).toBe(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-API-GenerateCiTemplateHandler-004
    describe('バリデーションエラーがある場合にexitCode=1が返ること', () => {
      context('GenerateCiTemplateUseCase.execute()→validationErrors=[1件]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          const generateUseCase = {
            execute: vi.fn().mockResolvedValue({
              templateType: 'invalid',
              triggerCondition: null,
              targetValidatorIds: [],
              failOnWarning: false,
              presetRef: 'standard',
              validationErrors: [{ code: 'CI_TEMPLATE_INVALID_TYPE', message: 'Invalid template type' }],
            }),
          };
          const renderUseCase = { execute: vi.fn() };
          const handler = new GenerateCiTemplateHandler(generateUseCase as any, renderUseCase as any);
          const actual = await handler.handle({
            presetId: 'standard',
            templateType: 'invalid' as any,
          });
          expect(actual.exitCode).toBe(1);
        });
      });
    });

    // IT-API-GenerateCiTemplateHandler-005
    describe('ValidatorIdsが空でINV-2違反の場合にexitCode=1が返ること', () => {
      context('validationErrors=[CI_TEMPLATE_EMPTY_VALIDATORS]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          const generateUseCase = {
            execute: vi.fn().mockResolvedValue({
              templateType: 'aidlc-gate',
              triggerCondition: 'pull_request',
              targetValidatorIds: [],
              failOnWarning: false,
              presetRef: 'minimal',
              validationErrors: [{ code: 'CI_TEMPLATE_EMPTY_VALIDATORS', message: 'No validators' }],
            }),
          };
          const renderUseCase = { execute: vi.fn() };
          const handler = new GenerateCiTemplateHandler(generateUseCase as any, renderUseCase as any);
          const actual = await handler.handle({
            presetId: 'minimal',
            templateType: 'aidlc-gate',
          });
          expect(actual.exitCode).toBe(1);
        });
      });
    });
  });
});
