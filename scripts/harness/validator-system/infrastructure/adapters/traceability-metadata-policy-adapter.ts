/**
 * @layer infrastructure
 * @unit validator-system
 *
 * TraceabilityMetadataPolicyAdapter — MetadataPolicyPort実装
 */
import type { MetadataPolicyPort } from "../../domain/ports/metadata-policy-port.js";
import type { HarnessErrorLike } from "../../domain/value-objects/validation-result.js";

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

    // WI-335: この suggestion は「<directive> <値> を先頭コメントに追加」という機械適用可能な
    // 文言契約を持つ（remediationType: 'mechanical'）。文言をこの形から変える場合は
    // remediation-round-trip テスト（機械適用器が同じ文言を解析する）が fail する。
    if (!hasUnit) {
      errors.push({
        code: { value: "L2-002", toString: () => "L2-002" },
        severity: { value: "error", toString: () => "error" },
        message: `メタデータ不足: @unit アノテーションがありません (${filePath})`,
        suggestion: "// @unit <unit-name> を先頭コメントに追加してください",
        remediationType: "mechanical",
      });
    }

    if (!hasLayer) {
      errors.push({
        code: { value: "L2-002", toString: () => "L2-002" },
        severity: { value: "error", toString: () => "error" },
        message: `メタデータ不足: @layer アノテーションがありません (${filePath})`,
        suggestion: "// @layer domain|application|infrastructure|presentation を先頭コメントに追加してください",
        remediationType: "mechanical",
      });
    }

    return { passed: errors.length === 0, errors };
  }
}
