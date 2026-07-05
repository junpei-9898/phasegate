/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-222
 *
 * HF2-05 / L4-007: AC 単位トレーサビリティ advisory サービス。
 *
 * このサービスは fileFallbackOnly な AC（story-level では linked だが、個別 AC を検証する
 * @ac 注釈付きテストが 1 件も無い AC）と orphanAcTags（解決に失敗した @ac）を
 * warning severity の finding へ変換する。**error は一切出さない**（ADR-019 §5: advisory tier は
 * non-blocking でなければならない）。fileFallbackOnly が 0 かつ orphanAcTags が空なら PASS。
 *
 * L3-004 の二値 pass/fail 判定には一切関与しない（verdict 不変）。
 */

export interface AcLevelCoverageSummary {
  readonly total: number;
  readonly acBound: number;
  readonly fileFallbackOnly: number;
}

export interface FileFallbackOnlyAc {
  readonly storyId: string;
  readonly acId: string;
}

export interface OrphanAcTag {
  readonly storyId: string;
  readonly filePath: string;
  readonly testName?: string;
  readonly rawTag: string;
  readonly reason: 'ac-not-in-story' | 'relative-multi-story';
}

export interface AcLevelTraceabilitySnapshot {
  readonly acLevelCoverage: AcLevelCoverageSummary;
  readonly fileFallbackOnlyAcs: readonly FileFallbackOnlyAc[];
  readonly orphanAcTags: readonly OrphanAcTag[];
}

export interface AcLevelTraceabilityFinding {
  readonly kind: 'file-fallback-only-ac' | 'orphan-ac-tag';
  readonly message: string;
  readonly suggestion: string;
}

export class AcLevelTraceabilityReport {
  readonly findings: readonly AcLevelTraceabilityFinding[];

  constructor(findings: readonly AcLevelTraceabilityFinding[]) {
    this.findings = Object.freeze([...findings]);
    Object.freeze(this);
  }

  hasFindings(): boolean {
    return this.findings.length > 0;
  }

  toHarnessErrors(): readonly {
    readonly code: { readonly value: string; toString(): string };
    readonly severity: { readonly value: string; toString(): string };
    readonly message: string;
    readonly suggestion: string;
    readonly kind: string;
  }[] {
    return this.findings.map((finding) => ({
      code: { value: 'L4-007', toString: () => 'L4-007' },
      severity: { value: 'warning', toString: () => 'warning' },
      message: finding.message,
      suggestion: finding.suggestion,
      kind: finding.kind,
    }));
  }
}

export class AcLevelTraceabilityService {
  check(snapshot: AcLevelTraceabilitySnapshot): AcLevelTraceabilityReport {
    const findings: AcLevelTraceabilityFinding[] = [];

    for (const ac of snapshot.fileFallbackOnlyAcs) {
      findings.push({
        kind: 'file-fallback-only-ac',
        message: `${ac.storyId} ${ac.acId} is linked only via file-fallback (no @ac-bound test asserts it individually).`,
        suggestion: `Add an "// @ac ${ac.storyId}-${ac.acId.replace(/^AC-/, '')}" annotation to the test case that specifically asserts ${ac.acId}, or accept this as a known file-level gap.`,
      });
    }

    for (const orphan of snapshot.orphanAcTags) {
      const location = orphan.testName ? `${orphan.filePath} ("${orphan.testName}")` : orphan.filePath;
      const reasonText = orphan.reason === 'relative-multi-story'
        ? 'relative @ac cannot be resolved because the file declares multiple @story tags'
        : 'the referenced AC does not belong to the file\'s story';
      findings.push({
        kind: 'orphan-ac-tag',
        message: `${location}: @ac "${orphan.rawTag}" is unresolved — ${reasonText}.`,
        suggestion: 'Use an absolute @ac (HXX-YY-N) that matches the file\'s @story, or split multi-story test files so relative AC-N resolves unambiguously.',
      });
    }

    return new AcLevelTraceabilityReport(findings);
  }
}
