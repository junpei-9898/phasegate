/**
 * @layer infrastructure
 * @unit nyquist-validation
 *
 * requirement-test-matrix.schema.json ローダー（シングルトンキャッシュ付き）
 */
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { cwd } from 'node:process';

let cachedSchema: unknown = null;

export async function loadMatrixSchema(): Promise<unknown> {
  if (cachedSchema !== null) {
    return cachedSchema;
  }

  // docs/contracts/requirement-test-matrix.schema.json はプロジェクトルート基準
  const schemaPath = resolve(join(cwd(), 'docs/contracts/requirement-test-matrix.schema.json'));
  const raw = await readFile(schemaPath, 'utf-8');
  cachedSchema = JSON.parse(raw);
  return cachedSchema;
}

export function clearSchemaCache(): void {
  cachedSchema = null;
}
