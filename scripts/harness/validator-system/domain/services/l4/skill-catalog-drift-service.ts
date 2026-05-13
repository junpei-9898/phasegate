/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-156
 */

export interface SkillCountDeclaration {
  readonly sourcePath: string;
  readonly declaredCount: number;
  readonly line: number;
}

export interface SkillCategoryDeclaration {
  readonly sourcePath: string;
  readonly categoryName: string;
  readonly declaredCount: number;
  readonly line: number;
}

export interface SkillCatalogSnapshot {
  readonly actualSkillNames: readonly string[];
  readonly countDeclarations: readonly SkillCountDeclaration[];
  readonly categoryDeclarations: readonly SkillCategoryDeclaration[];
}

export interface SkillCatalogDriftFinding {
  readonly kind: 'skill-count-mismatch' | 'skill-category-total-mismatch';
  readonly sourcePath: string;
  readonly message: string;
  readonly suggestion: string;
  readonly expectedCount: number;
  readonly actualCount: number;
  readonly line?: number;
}

export class SkillCatalogDriftReport {
  readonly findings: readonly SkillCatalogDriftFinding[];

  constructor(findings: readonly SkillCatalogDriftFinding[]) {
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
    readonly sourcePath: string;
    readonly expectedCount: number;
    readonly actualCount: number;
    readonly line?: number;
  }[] {
    return this.findings.map((finding) => ({
      code: { value: 'L4-006', toString: () => 'L4-006' },
      severity: { value: 'warning', toString: () => 'warning' },
      message: finding.message,
      suggestion: finding.suggestion,
      kind: finding.kind,
      sourcePath: finding.sourcePath,
      expectedCount: finding.expectedCount,
      actualCount: finding.actualCount,
      line: finding.line,
    }));
  }
}

export class SkillCatalogDriftService {
  check(snapshot: SkillCatalogSnapshot): SkillCatalogDriftReport {
    const actualCount = snapshot.actualSkillNames.length;
    const findings: SkillCatalogDriftFinding[] = [];

    for (const declaration of snapshot.countDeclarations) {
      if (declaration.declaredCount !== actualCount) {
        findings.push({
          kind: 'skill-count-mismatch',
          sourcePath: declaration.sourcePath,
          line: declaration.line,
          expectedCount: actualCount,
          actualCount: declaration.declaredCount,
          message: `${declaration.sourcePath}:${declaration.line} declares ${declaration.declaredCount} skills, but skills/*/SKILL.md contains ${actualCount}.`,
          suggestion: 'Update the documented skill count or add/remove the corresponding skill directory in the same release change.',
        });
      }
    }

    if (snapshot.categoryDeclarations.length > 0) {
      const categoryTotal = snapshot.categoryDeclarations.reduce((sum, declaration) => sum + declaration.declaredCount, 0);
      if (categoryTotal !== actualCount) {
        findings.push({
          kind: 'skill-category-total-mismatch',
          sourcePath: snapshot.categoryDeclarations[0]?.sourcePath ?? 'docs/guide/skills-overview.md',
          expectedCount: actualCount,
          actualCount: categoryTotal,
          message: `Skill category headings sum to ${categoryTotal} skills, but skills/*/SKILL.md contains ${actualCount}.`,
          suggestion: 'Update docs/guide/skills-overview.md category heading counts so their sum matches the actual skill catalog.',
        });
      }
    }

    return new SkillCatalogDriftReport(findings);
  }
}
