/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-227
 *
 * NyquistAcBoundCoveragePolicyAdapter — AcBoundCoveragePolicyPort 実装（L3-005）
 *
 * FAIL-CLOSED: matrix の不在・parse 不能・例外はいずれも passed=false（不合格）として扱う。
 * L4-007（advisory / fail-open）とは対照的に、L3-005 は CI を落とす blocking tier である。
 *
 * 判定: `acBoundStories`（スコープ）内の各 storyId について、matrix 上の全 linked AC を走査し、
 * testReferences に `binding:"ac"` を 1 件も持たない AC（fileFallbackOnly）が 1 つでもあれば FAIL。
 * スコープ外 story は完全に無視する。スコープが空なら検査対象が無いため PASS。
 *
 * matrix path は config（layers.L3.requirementMatrixPath）から供給される。CI では
 * phasegate:generate-matrix で事前生成された最新マトリクスを READ する（L3-004 と同じ規約）。
 */
import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import type { AcBoundCoveragePolicyPort } from '../../domain/ports/ac-bound-coverage-policy-port.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

const DEFAULT_MATRIX_PATH = '.harness/requirement-test-matrix.json';

interface MatrixTestReference {
  readonly binding?: string;
}

interface MatrixAcMapping {
  readonly acId?: string;
  readonly testReferences?: readonly MatrixTestReference[];
}

interface MatrixStory {
  readonly storyId?: string;
  readonly storyMappings?: readonly MatrixAcMapping[];
  readonly acMappings?: readonly MatrixAcMapping[];
}

function toL3005Error(message: string, suggestion: string): HarnessErrorLike {
  return {
    code: { value: 'L3-005', toString: () => 'L3-005' },
    severity: { value: 'error', toString: () => 'error' },
    message,
    suggestion,
  };
}

export class NyquistAcBoundCoveragePolicyAdapter implements AcBoundCoveragePolicyPort {
  async checkAcBoundCoverage(context: {
    matrixFilePath?: string;
    acBoundStories: readonly string[];
  }): Promise<{ passed: boolean; errors: readonly HarnessErrorLike[] }> {
    const scope = new Set(context.acBoundStories);
    // スコープが空 = 検査すべき in-scope AC が存在しない → PASS
    if (scope.size === 0) {
      return { passed: true, errors: [] };
    }

    const rootDir = process.cwd();
    const relativeOrAbsolute =
      context.matrixFilePath && context.matrixFilePath.length > 0 ? context.matrixFilePath : DEFAULT_MATRIX_PATH;
    const matrixFilePath = isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : join(rootDir, relativeOrAbsolute);

    let parsed: unknown;
    try {
      const raw = await readFile(matrixFilePath, 'utf8');
      parsed = JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // FAIL-CLOSED: 不在・parse 不能はいずれも不合格
      return {
        passed: false,
        errors: [
          toL3005Error(
            `AC-bound マトリクスを読み込めません（L3-005 は fail-closed）: ${relativeOrAbsolute}: ${message}`,
            `${relativeOrAbsolute} を生成してください（phasegate:generate-matrix）。パスは config の layers.L3.requirementMatrixPath で変更できます`,
          ),
        ],
      };
    }

    const stories = this.extractStories(parsed);
    const errors: HarnessErrorLike[] = [];

    for (const story of stories) {
      const storyId = story.storyId ?? '';
      if (!scope.has(storyId)) continue; // スコープ外は無視

      const acMappings = story.storyMappings ?? story.acMappings ?? [];
      for (const ac of acMappings) {
        const refs = ac.testReferences ?? [];
        if (refs.length === 0) continue; // 未リンク AC は L3-004 の責務。L3-005 は ac-binding 有無のみ判定
        const hasAcBound = refs.some((ref) => ref.binding === 'ac');
        if (!hasAcBound) {
          errors.push(
            toL3005Error(
              `AC-bound coverage 不足: ${storyId}.${ac.acId ?? '?'} は binding:"ac" のテスト参照を持ちません（fileFallbackOnly）`,
              `${storyId}.${ac.acId ?? '?'} を検証するテストに @ac タグ（絶対 ${storyId}-N / 相対 AC-N）を付与してください`,
            ),
          );
        }
      }
    }

    if (errors.length === 0) {
      return { passed: true, errors: [] };
    }
    return { passed: false, errors };
  }

  private extractStories(parsed: unknown): readonly MatrixStory[] {
    if (typeof parsed !== 'object' || parsed === null) return [];
    const obj = parsed as { stories?: unknown; storyMappings?: unknown };
    const raw = Array.isArray(obj.stories) ? obj.stories : Array.isArray(obj.storyMappings) ? obj.storyMappings : [];
    return raw as readonly MatrixStory[];
  }
}
