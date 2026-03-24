import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  ValidatorSystemExecutionAdapter,
  type IValidatorSystemStub,
} from '../../../harness-api/infrastructure/adapters/validator-system-execution-adapter.js';

target('ValidatorSystemExecutionAdapter', () => {
  // ─── IT-Adapter-Validator-001 ───
  describe('runL3Validators: スタブが通過チェック項目を返す場合', () => {
    context('stubがValidatorCheckItem[]を返す場合', () => {
      it('そのまま転送されてValidatorCheckItem[]が返される', async () => {
        // Arrange
        const stub: IValidatorSystemStub = {
          runL3Validators: vi.fn().mockResolvedValue([
            { validatorId: 'L3-001', passed: true, errors: [] },
            { validatorId: 'L3-002', passed: true, errors: [] },
          ]),
          runAllValidators: vi.fn(),
          runDriftDetection: vi.fn(),
        };
        const adapter = new ValidatorSystemExecutionAdapter(stub);

        // Act
        const actual = await adapter.runL3Validators();

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[0].validatorId).toBe('L3-001');
        expect(actual[0].passed).toBe(true);
      });
    });
  });

  // ─── IT-Adapter-Validator-002 ───
  describe('runL3Validators: スタブが空配列を返す場合', () => {
    context('stubが[]を返す場合', () => {
      it('空配列が返される', async () => {
        // Arrange
        const stub: IValidatorSystemStub = {
          runL3Validators: vi.fn().mockResolvedValue([]),
          runAllValidators: vi.fn(),
          runDriftDetection: vi.fn(),
        };
        const adapter = new ValidatorSystemExecutionAdapter(stub);

        // Act
        const actual = await adapter.runL3Validators();

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  // ─── IT-Adapter-Validator-003 ───
  describe('runAllValidators: スタブが複数バリデータ結果を返す場合', () => {
    context('stubがValidatorCheckItem[]を返す場合', () => {
      it('全バリデータ結果が返される', async () => {
        // Arrange
        const stub: IValidatorSystemStub = {
          runL3Validators: vi.fn(),
          runAllValidators: vi.fn().mockResolvedValue([
            { validatorId: 'L1-001', passed: true, errors: [] },
            { validatorId: 'L3-001', passed: false, errors: [{ code: 'E001', severity: 'error', message: 'test error' }] },
          ]),
          runDriftDetection: vi.fn(),
        };
        const adapter = new ValidatorSystemExecutionAdapter(stub);

        // Act
        const actual = await adapter.runAllValidators();

        // Assert
        expect(actual).toHaveLength(2);
        expect(actual[1].passed).toBe(false);
        expect(actual[1].errors).toHaveLength(1);
      });
    });
  });

  // ─── IT-Adapter-Validator-004 ───
  describe('runDriftDetection: スタブがDriftItemを返す場合', () => {
    context('stubが1件のDriftItemを返す場合', () => {
      it('DriftItem[]が返される', async () => {
        // Arrange
        const stub: IValidatorSystemStub = {
          runL3Validators: vi.fn(),
          runAllValidators: vi.fn(),
          runDriftDetection: vi.fn().mockResolvedValue([
            {
              direction: 'design-to-code',
              unit: 'harness-api',
              element: 'CliCommand',
              recommendation: 'CommandRegistryへの登録を確認',
            },
          ]),
        };
        const adapter = new ValidatorSystemExecutionAdapter(stub);

        // Act
        const actual = await adapter.runDriftDetection();

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].unit).toBe('harness-api');
      });
    });
  });

  // ─── IT-Adapter-Validator-005 ───
  describe('runL3Validators: スタブがエラーをスローした場合、エラーを含むチェック項目を返すこと', () => {
    context('stubがErrorをスローする場合', () => {
      it('validatorId=L3-error・passed=falseのValidatorCheckItemが返される（例外は伝播しない）', async () => {
        // Arrange
        const stub: IValidatorSystemStub = {
          runL3Validators: vi.fn().mockRejectedValue(new Error('network failure')),
          runAllValidators: vi.fn(),
          runDriftDetection: vi.fn(),
        };
        const adapter = new ValidatorSystemExecutionAdapter(stub);

        // Act
        const actual = await adapter.runL3Validators();

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]?.passed).toBe(false);
        expect(actual[0]?.errors?.[0]?.message).toContain('network failure');
      });
    });
  });

  // ─── IT-Adapter-Validator-006 ───
  describe('スタブ未指定（デフォルト）の場合、実際のvalidator-systemを呼び出すこと', () => {
    context('コンストラクタ引数なしで生成した場合', () => {
      it('runL3Validators・runAllValidatorsが実バリデーター結果を返し、runDriftDetectionが配列を返す', async () => {
        // Arrange
        const adapter = new ValidatorSystemExecutionAdapter();

        // Act
        const l3Result = await adapter.runL3Validators();
        const allResult = await adapter.runAllValidators();
        const driftResult = await adapter.runDriftDetection();

        // Assert — スタブではなく実実装が呼ばれることを確認
        expect(Array.isArray(l3Result)).toBe(true);
        expect(Array.isArray(allResult)).toBe(true);
        expect(Array.isArray(driftResult)).toBe(true);
        // 実validator-systemはL3-001〜L3-004の結果を返す
        expect(l3Result.length).toBeGreaterThan(0);
      });
    });
  });
});
