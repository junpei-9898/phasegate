/**
 * @layer infrastructure
 * @unit nyquist-validation
 *
 * JSONスキーマバリデーション実装: Ajv
 */
import AjvModule, { type ErrorObject, type ValidateFunction } from 'ajv';
const Ajv = AjvModule.default ?? AjvModule;
import type { NyquistHarnessError } from '../../domain/services/ac-coverage-gate-policy.js';
import type { AjvValidatorPort } from '../../application/usecases/validate-matrix-usecase.js';
import { loadMatrixSchema } from '../schema/matrix-schema-loader.js';

function convertAjvError(err: ErrorObject): NyquistHarnessError {
  let message: string;

  switch (err.keyword) {
    case 'required':
      message = `${err.instancePath || '(root)'} に必須フィールド '${String(err.params['missingProperty'] ?? '')}' がありません`;
      break;
    case 'type':
      message = `${err.instancePath} の型が不正です。期待: ${String(err.params['type'] ?? '')}`;
      break;
    case 'pattern':
      message = `${err.instancePath} の値が形式 '${String(err.params['pattern'] ?? '')}' に一致しません`;
      break;
    case 'enum':
      message = `${err.instancePath} の値は許容値のいずれでもありません`;
      break;
    default:
      message = err.message ?? `スキーマバリデーションエラー: ${err.instancePath}`;
  }

  return { code: 'L3-004', severity: 'error', message };
}

export class AjvJsonSchemaValidatorAdapter implements AjvValidatorPort {
  private readonly ajv: InstanceType<typeof Ajv>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  async validate(data: unknown): Promise<{ valid: boolean; errors: NyquistHarnessError[] }> {
    const schema = await loadMatrixSchema();
    const validateFn: ValidateFunction = this.ajv.compile(schema as object);
    const valid = validateFn(data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors: NyquistHarnessError[] = (validateFn.errors ?? []).map((e) => convertAjvError(e));
    return { valid: false, errors };
  }
}
