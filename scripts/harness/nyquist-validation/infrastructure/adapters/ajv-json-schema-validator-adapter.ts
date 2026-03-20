/**
 * @layer infrastructure
 * @unit nyquist-validation
 *
 * JSONスキーマバリデーション実装: Ajv
 */
import Ajv from 'ajv';
import type { NyquistHarnessError } from '../../domain/services/ac-coverage-gate-policy.js';
import type { AjvValidatorPort } from '../../application/usecases/validate-matrix-usecase.js';
import { loadMatrixSchema } from '../schema/matrix-schema-loader.js';

interface AjvErrorObject {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  params: Record<string, unknown>;
  message?: string;
}

function convertAjvError(err: AjvErrorObject): NyquistHarnessError {
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
  // biome-ignore lint/suspicious/noExplicitAny: Ajv v8 namespace/class type conflict
  private readonly ajv: any;

  constructor() {
    // biome-ignore lint/suspicious/noExplicitAny: Ajv v8 default export typing
    this.ajv = new (Ajv as any)({ allErrors: true });
  }

  async validate(data: unknown): Promise<{ valid: boolean; errors: NyquistHarnessError[] }> {
    const schema = await loadMatrixSchema();
    const validateFn = this.ajv.compile(schema as object);
    const valid = validateFn(data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    // biome-ignore lint/suspicious/noExplicitAny: Ajv error objects typed via AjvErrorObject cast
    const errors: NyquistHarnessError[] = (validateFn.errors ?? []).map((e: any) =>
      convertAjvError(e as AjvErrorObject)
    );
    return { valid: false, errors };
  }
}
