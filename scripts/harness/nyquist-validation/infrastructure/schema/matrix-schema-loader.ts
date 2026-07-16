/**
 * @layer infrastructure
 * @unit nyquist-validation
 * @work-item-id WI-222
 * @work-item-id WI-292
 *
 * requirement-test-matrix.schema.json ローダー（シングルトンキャッシュ付き）
 *
 * HF2-05 (schema 1.1): testReferences に optional な `binding` enum（"ac"|"file"）を追加。
 * 1.1 は追加フィールドが optional かつ additionalProperties:false を満たすため、
 * `binding` を持たない 1.0 マトリクスも引き続き検証を通過する（後方互換）。
 *
 * WI-292 (schema 1.2): Story に optional な coverageStatus / coverageLifecycle を追加。
 * 省略された 1.0/1.1 Story は application 層で required / [required] へ正規化する。
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
