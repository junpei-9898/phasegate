// @unit attestation
// @layer domain

/**
 * AcBoundScopeService（H16-03 / WI-227）
 *
 * requirement-test-matrix + allowlist から acBoundScope を機械導出する純粋・決定論サービス。
 * 生成（produce）と検証（verify anti-laundering 再導出）で完全に同一の結果を返す（option-a determinism）。
 *
 * 資格条件（domain_model INV-8）: story が返り値に含まれる ⟺
 *   (1) allowlist に含まれ、かつ
 *   (2) その story の全 linked AC が ≥1 の `binding:"ac"` テスト参照を持つ（fileFallbackOnly===0）。
 *
 * anti-laundering: 導出は stored matrix + config allowlist のみを真実の源とする。格納 acBoundScope を
 * 過大主張へ改竄しても、再導出は matrix/allowlist の honest な結果を返すため mismatch が検出される。
 *
 * `granularity.traceability.level`（"file"）とは完全に独立した別次元の主張である。
 */

interface MatrixTestReference {
  readonly binding?: string;
}

interface MatrixAcMapping {
  readonly testReferences?: readonly MatrixTestReference[];
}

interface MatrixStory {
  readonly storyId?: string;
  readonly storyMappings?: readonly MatrixAcMapping[];
  readonly acMappings?: readonly MatrixAcMapping[];
}

export class AcBoundScopeService {
  /**
   * @param matrix requirement-test-matrix（parse 済み plain object）
   * @param allowlist スコープ対象 story-id
   * @returns 資格を満たす story-id の昇順ソート配列
   */
  derive(matrix: unknown, allowlist: readonly string[]): string[] {
    const scope = new Set(allowlist);
    if (scope.size === 0) return [];

    const stories = this.extractStories(matrix);
    const qualified: string[] = [];

    for (const story of stories) {
      const storyId = story.storyId ?? "";
      if (!scope.has(storyId)) continue;

      const acMappings = story.storyMappings ?? story.acMappings ?? [];
      // linked AC が 1 件も無い場合は資格対象外（検証すべき AC が存在しない）。
      if (acMappings.length === 0) continue;

      const everyAcBound = acMappings.every((ac) => {
        const refs = ac.testReferences ?? [];
        // 未リンク AC（refs 空）があれば ac-bound 主張は成立しない。
        if (refs.length === 0) return false;
        return refs.some((ref) => ref.binding === "ac");
      });

      if (everyAcBound) {
        qualified.push(storyId);
      }
    }

    return qualified.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  private extractStories(matrix: unknown): readonly MatrixStory[] {
    if (typeof matrix !== "object" || matrix === null) return [];
    const obj = matrix as { stories?: unknown; storyMappings?: unknown };
    const raw = Array.isArray(obj.stories)
      ? obj.stories
      : Array.isArray(obj.storyMappings)
        ? obj.storyMappings
        : [];
    return raw as readonly MatrixStory[];
  }
}
