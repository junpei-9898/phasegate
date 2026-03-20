/**
 * @layer infrastructure
 * @unit validator-system
 *
 * TraceabilityMetadataPolicyAdapter — MetadataPolicyPort実装
 */
import type { MetadataPolicyPort } from '../../domain/ports/metadata-policy-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

export class TraceabilityMetadataPolicyAdapter implements MetadataPolicyPort {
  async validateMetadata(context: { filePath: string; fileContent: string }): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
  }> {
    const errors: HarnessErrorLike[] = [];
    const { fileContent, filePath } = context;

    const hasUnit = /@unit\s+\S+/.test(fileContent);
    const hasLayer = /@layer\s+\S+/.test(fileContent);
    const hasStoryId = /@story-id\s+H\d{2}-\d{2}/.test(fileContent) || /@story\s+H\d{2}-\d{2}/.test(fileContent);

    if (!hasUnit) {
      errors.push({
        code: { value: 'L2-002', toString: () => 'L2-002' },
        severity: { value: 'error', toString: () => 'error' },
        message: `メタデータ不足: @unit アノテーションがありません (${filePath})`,
        suggestion: '// @unit <unit-name> を先頭コメントに追加してください',
      });
    }

    if (!hasLayer) {
      errors.push({
        code: { value: 'L2-002', toString: () => 'L2-002' },
        severity: { value: 'error', toString: () => 'error' },
        message: `メタデータ不足: @layer アノテーションがありません (${filePath})`,
        suggestion: '// @layer domain|application|infrastructure|presentation を先頭コメントに追加してください',
      });
    }

    return { passed: errors.length === 0, errors };
  }
}
