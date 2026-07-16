// @unit validator-system
// @layer infrastructure
// @work-item-id WI-268

import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type {
  CoverageAttestationVerificationCollectResult,
  CoverageAttestationVerificationPolicyPort,
} from "../../domain/ports/coverage-attestation-verification-policy-port.js";
import type { AttestationReference } from "../../domain/value-objects/attestation-verification-report.js";

const COVERAGE_REPORT_FILE = "coverage_report.md";
const CONSTRUCTION_REL = join("docs", "product", "construction");
const LEGACY_MARKER = /<!--\s*@coverage-gating:\s*ungated-legacy\s*-->/;
/** `<!-- @attestation <id> -->` の id を捕捉する（1 行内複数を許容）。 */
const ATTESTATION_REF_GLOBAL = /<!--\s*@attestation\s+([^\s>-][^>]*?)\s*-->/g;
const DEFAULT_MATRIX_PATH = ".harness/requirement-test-matrix.json";

interface MatrixTestReference {
  readonly filePath?: string;
}

interface MatrixAcMapping {
  readonly testReferences?: readonly MatrixTestReference[];
}

interface MatrixStory {
  readonly storyId?: string;
  readonly storyMappings?: readonly MatrixAcMapping[];
  readonly acMappings?: readonly MatrixAcMapping[];
}

/**
 * WI-268 / ADR-030 §Decision.1・§Decision.3.②（第2段） — L3-007 の走査・解決アダプタ。
 *
 * `docs/product/construction/*​/coverage_report.md` を cwd 起点で走査し（targetPaths 非依存の
 * corpus 走査。L2-016 と同様に自前でファイル探索する）、ungated-legacy マーカー付きファイルを除外して
 * `<!-- @attestation <id> -->` 参照を抽出する。
 *
 * 参照が 1 件以上ある場合のみ requirement-test-matrix を読み、resolvable scope
 * （storyId 存在 かつ testReferences >= 1 の story-id 集合）を解決する。matrix 不在・parse 不能は
 * fail-closed（matrixError を返す）。参照 0 件なら matrix を読まず空 evidence + matrixError=null。
 */
export class FileSystemCoverageAttestationVerificationAdapter
  implements CoverageAttestationVerificationPolicyPort
{
  constructor(
    private readonly projectRoot: string,
    private readonly matrixFilePath: string = DEFAULT_MATRIX_PATH,
  ) {}

  async collect(): Promise<CoverageAttestationVerificationCollectResult> {
    const references = await this.collectReferences();

    // 参照が 1 件も無ければ matrix を読みに行かず PASS（最小副作用）。
    if (references.length === 0) {
      return Object.freeze({
        references: Object.freeze([]),
        evidence: { resolvableScopeIds: new Set<string>() },
        matrixError: null,
      });
    }

    const resolved = await this.resolveScopeEvidence();
    if (resolved.error !== null) {
      // 参照ありで matrix を読めない → fail-closed。
      return Object.freeze({
        references: Object.freeze(references),
        evidence: { resolvableScopeIds: new Set<string>() },
        matrixError: resolved.error,
      });
    }

    return Object.freeze({
      references: Object.freeze(references),
      evidence: { resolvableScopeIds: resolved.scopeIds },
      matrixError: null,
    });
  }

  private async collectReferences(): Promise<AttestationReference[]> {
    const constructionRoot = join(this.projectRoot, CONSTRUCTION_REL);
    let unitDirs: string[];
    try {
      const entries = await readdir(constructionRoot, { withFileTypes: true });
      unitDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }

    const references: AttestationReference[] = [];
    for (const unitDir of unitDirs) {
      const filePath = join(constructionRoot, unitDir, COVERAGE_REPORT_FILE);
      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch {
        continue;
      }
      const relPath = `${CONSTRUCTION_REL.replace(/\\/g, "/")}/${unitDir}/${COVERAGE_REPORT_FILE}`;
      this.parseReferences(relPath, content, references);
    }
    return references;
  }

  /** ungated-legacy マーカー付きファイルは免除。それ以外は各 @attestation 参照を抽出する。 */
  private parseReferences(path: string, content: string, out: AttestationReference[]): void {
    const lines = content.split(/\r?\n/);
    if (lines.some((line) => LEGACY_MARKER.test(line))) return;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      ATTESTATION_REF_GLOBAL.lastIndex = 0;
      let match: RegExpExecArray | null = ATTESTATION_REF_GLOBAL.exec(line);
      while (match !== null) {
        const id = match[1].trim();
        if (id.length > 0) {
          out.push({ id, sourcePath: path, lineNumber: i + 1 });
        }
        match = ATTESTATION_REF_GLOBAL.exec(line);
      }
    }
  }

  private async resolveScopeEvidence(): Promise<{ scopeIds: Set<string>; error: string | null }> {
    const relativeOrAbsolute = this.matrixFilePath.length > 0 ? this.matrixFilePath : DEFAULT_MATRIX_PATH;
    const absPath = isAbsolute(relativeOrAbsolute)
      ? relativeOrAbsolute
      : join(this.projectRoot, relativeOrAbsolute);

    let parsed: unknown;
    try {
      const raw = await readFile(absPath, "utf-8");
      parsed = JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        scopeIds: new Set<string>(),
        error: `requirement-test-matrix を読み込めません（L3-007 は fail-closed）: ${relativeOrAbsolute}: ${message}`,
      };
    }

    const scopeIds = new Set<string>();
    for (const story of this.extractStories(parsed)) {
      const storyId = story.storyId;
      if (!storyId) continue;
      const mappings = story.storyMappings ?? story.acMappings ?? [];
      const hasTestRef = mappings.some((ac) => (ac.testReferences?.length ?? 0) > 0);
      if (hasTestRef) scopeIds.add(storyId);
    }
    return { scopeIds, error: null };
  }

  private extractStories(parsed: unknown): readonly MatrixStory[] {
    if (typeof parsed !== "object" || parsed === null) return [];
    const obj = parsed as { stories?: unknown; storyMappings?: unknown };
    const raw = Array.isArray(obj.stories)
      ? obj.stories
      : Array.isArray(obj.storyMappings)
        ? obj.storyMappings
        : [];
    return raw as readonly MatrixStory[];
  }
}
