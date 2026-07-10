// @unit validator-system
// @layer infrastructure
// @work-item-id WI-258

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CoverageAttestationGatingPolicyPort } from "../../domain/ports/coverage-attestation-gating-policy-port.js";
import type { CoverageClaim, CoverageReportGatingModel } from "../../domain/value-objects/coverage-gating-report.js";

const COVERAGE_REPORT_FILE = "coverage_report.md";
const CONSTRUCTION_REL = join("docs", "product", "construction");
const LEGACY_MARKER = /<!--\s*@coverage-gating:\s*ungated-legacy\s*-->/;
const ATTESTATION_REF = /<!--\s*@attestation\b/;
const CHECKMARK = "✅"; // ✅
const COMMENT_LINE = /^\s*<!--/;

/**
 * WI-258 / ADR-030 §Decision.3.② — coverage-attestation-gating (L2-016) の走査アダプタ。
 *
 * `docs/product/construction/*​/coverage_report.md` を cwd 起点で走査し（targetPaths 非依存の
 * corpus 走査。L2-014 と同様に自前でファイル探索する）、各ファイルを CoverageReportGatingModel 化する。
 *
 * - legacy マーカー: `<!-- @coverage-gating: ungated-legacy -->` の有無。
 * - ✅ claim: `✅` を含む行。同一行に `<!-- @attestation ... -->` があるか、
 *   直前の連続コメント行に `@attestation` があれば hasAttestationRef=true。
 */
export class FileSystemCoverageAttestationGatingAdapter implements CoverageAttestationGatingPolicyPort {
  constructor(private readonly projectRoot: string) {}

  async collect(): Promise<readonly CoverageReportGatingModel[]> {
    const constructionRoot = join(this.projectRoot, CONSTRUCTION_REL);
    let unitDirs: string[];
    try {
      const entries = await readdir(constructionRoot, { withFileTypes: true });
      unitDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return Object.freeze([]);
    }

    const models: CoverageReportGatingModel[] = [];
    for (const unitDir of unitDirs) {
      const filePath = join(constructionRoot, unitDir, COVERAGE_REPORT_FILE);
      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch {
        continue;
      }
      // path は project-relative で報告する（メッセージの可搬性のため）。
      const relPath = `${CONSTRUCTION_REL.replace(/\\/g, "/")}/${unitDir}/${COVERAGE_REPORT_FILE}`;
      models.push(this.parse(relPath, content));
    }
    return Object.freeze(models);
  }

  private parse(path: string, content: string): CoverageReportGatingModel {
    const lines = content.split(/\r?\n/);
    const hasLegacyMarker = lines.some((line) => LEGACY_MARKER.test(line));

    const claims: CoverageClaim[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(CHECKMARK)) continue;
      claims.push({
        lineNumber: i + 1,
        hasAttestationRef: this.hasAttestationRef(lines, i),
      });
    }

    return { path, hasLegacyMarker, claims };
  }

  /**
   * ✅ 行 index について attestation 参照があるか判定する。
   * (1) 同一行にコメント参照、または
   * (2) 直前の連続するコメント行のいずれかに `@attestation` 参照がある。
   */
  private hasAttestationRef(lines: readonly string[], index: number): boolean {
    if (ATTESTATION_REF.test(lines[index])) return true;
    for (let j = index - 1; j >= 0; j--) {
      const prev = lines[j];
      if (!COMMENT_LINE.test(prev)) break;
      if (ATTESTATION_REF.test(prev)) return true;
    }
    return false;
  }
}
