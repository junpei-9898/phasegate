/**
 * @layer infrastructure
 * @unit config-foundation
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AjvModule, { type ErrorObject, type ValidateFunction } from 'ajv';
const Ajv = AjvModule.default ?? AjvModule;
import { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';
import type { ConfigSchemaValidatorPort } from '../../domain/ports/config-schema-validator-port.js';

type HarnessErrorWithPath = HarnessError & {
  readonly errorCode: string;
  readonly path: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../schemas/harness-config-v2.schema.json');

function loadSchema(): object {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
  return JSON.parse(raw) as object;
}

function createValidateFunction(): ValidateFunction {
  const ajv = new Ajv({
    allErrors: true,
  });

  return ajv.compile(loadSchema());
}

function buildPath(error: ErrorObject): string {
  const errorParams = error.params as Record<string, unknown>;
  // ajv v8 では instancePath が JSON Pointer 形式（v6 の dataPath に相当）
  const instancePath = error.instancePath ?? '';

  if (error.keyword === 'required') {
    const missingProperty = String(errorParams.missingProperty ?? '');
    return `${instancePath}/${missingProperty}` || '/';
  }

  if (error.keyword === 'additionalProperties') {
    const additionalProperty = String(errorParams.additionalProperty ?? '');
    return `${instancePath}/${additionalProperty}` || '/';
  }

  return instancePath || '/';
}

function buildErrorCode(error: ErrorObject, actualPath: string): string {
  if (error.keyword === 'enum' && actualPath === '/project/preset') {
    return 'L1-002';
  }

  if (error.keyword === 'minimum' && actualPath === '/harnesses/bundleSizeLimit') {
    return 'L1-003';
  }

  return 'L1-001';
}

function buildMessage(error: ErrorObject, actualPath: string): string {
  const errorParams = error.params as Record<string, unknown>;

  switch (error.keyword) {
    case 'required':
      return `required: ${actualPath} is required`;
    case 'minimum':
      return `minimum: ${actualPath} must be >= ${String(errorParams.limit)}`;
    case 'enum':
      return `enum: ${actualPath} must be one of ${String(
        (errorParams.allowedValues as readonly unknown[] | undefined)?.join(', ') ?? '',
      )}`;
    case 'additionalProperties':
      return `additionalProperties: ${actualPath} is not allowed`;
    default:
      return `${error.keyword}: ${actualPath} ${error.message ?? 'is invalid'}`;
  }
}

function toHarnessError(error: ErrorObject): HarnessErrorWithPath {
  const actualPath = buildPath(error);
  const errorCode = buildErrorCode(error, actualPath);
  const harnessError = new HarnessError({
    code: ErrorCode.create(errorCode),
    severity: Severity.create('error'),
    message: buildMessage(error, actualPath),
    suggestion: '設定ファイルを修正してください',
    adrRef: null,
    fixExample: null,
  }) as HarnessErrorWithPath;

  return Object.assign(harnessError, {
    errorCode,
    path: actualPath,
  });
}

const validateSchema = createValidateFunction();

export class AjvConfigSchemaValidator implements ConfigSchemaValidatorPort {
  validate(document: unknown): readonly HarnessError[] {
    const valid = validateSchema(document);

    if (valid) {
      return [];
    }

    return (validateSchema.errors ?? []).map((error) => toHarnessError(error));
  }
}
