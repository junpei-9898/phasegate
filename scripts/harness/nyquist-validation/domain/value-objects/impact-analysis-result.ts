/**
 * @layer domain
 * @unit nyquist-validation
 *
 * テストケース逆引き結果を表す値オブジェクト
 */
import { TestReference } from './test-reference.js';

export interface ImpactAnalysisResultProps {
  readonly storyId: string;
  readonly directTests: readonly TestReference[];
}

export class ImpactAnalysisResult {
  readonly storyId: string;
  readonly directTests: readonly TestReference[];
  readonly directMappingOnly: true = true;

  private constructor(storyId: string, directTests: readonly TestReference[]) {
    this.storyId = storyId;
    this.directTests = Object.freeze([...directTests]);
    Object.freeze(this);
  }

  static create(props: ImpactAnalysisResultProps): ImpactAnalysisResult {
    // filePath単位で重複を除去する
    const seen = new Set<string>();
    const deduped: TestReference[] = [];
    for (const ref of props.directTests) {
      const key = `${ref.filePath}::${ref.testType}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(ref);
      }
    }
    return new ImpactAnalysisResult(props.storyId, deduped);
  }

  isEmpty(): boolean {
    return this.directTests.length === 0;
  }

  equals(other: ImpactAnalysisResult): boolean {
    if (this.storyId !== other.storyId) return false;
    if (this.directTests.length !== other.directTests.length) return false;
    return this.directTests.every((ref, i) => ref.equals(other.directTests[i]));
  }
}
