// @unit skill-quality
// @layer test
// @story WI-241
// @work-item-id WI-241

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, expect, it } from "vitest";
import { SkillStructureValidator } from "../../../skill-quality/domain/services/skill-structure-validator.js";
import { SkillStructure } from "../../../skill-quality/domain/value-objects/skill-structure.js";
import { FileSystemSkillFileReaderAdapter } from "../../../skill-quality/infrastructure/adapters/file-system-skill-file-reader-adapter.js";
import { context, target } from "../../helpers/test-helpers.js";

/**
 * WI-241 / H12-06-AC-2 / H12-06-AC-3: 実 `skills/*` コーパスの適合性を、本番コードパス
 * （`FileSystemSkillFileReaderAdapter` + `SkillStructureValidator`）でディスクから読み込んで検証する。
 * モック無し・実成果物検証。skill-kind taxonomy により、全スキルが宣言 kind の必須構造に適合する。
 */

const SKILLS_ROOT = path.resolve(__dirname, "../../../../../skills");

const ADVISORY_SKILLS = [
  "codex-delegator",
  "doc-health-checker",
  "engineering-perspective",
  "implementation-readiness-checker",
  "phasegate-config-doctor",
  "phasegate-toolkit-guide",
  "release-publisher",
  "skill-creator",
];

interface SkillEntry {
  readonly name: string;
  readonly skillFilePath: string;
}

function listSkills(): readonly SkillEntry[] {
  return readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(path.join(SKILLS_ROOT, name, "SKILL.md")))
    .sort()
    .map((name) => ({ name, skillFilePath: path.join(SKILLS_ROOT, name, "SKILL.md") }));
}

const reader = new FileSystemSkillFileReaderAdapter();
const validator = new SkillStructureValidator(reader);

target("H12-06 実 skills コーパス適合性（WI-241 skill-kind taxonomy）", () => {
  let skills: readonly SkillEntry[];

  beforeAll(() => {
    skills = listSkills();
  });

  context("AC-2/AC-3: 全 29 スキルが宣言 kind の必須構造に適合すること", () => {
    it("全スキルの SKILL.md が宣言 kind の必須構造に適合する（@ac H12-06-AC-2 / @ac H12-06-AC-3）", async () => {
      // Arrange
      const failures: string[] = [];
      // Act
      for (const skill of skills) {
        const result = await validator.validate(skill.skillFilePath);
        if (!result.passed) {
          failures.push(`${skill.name}: 欠落=[${result.missingSection.join(", ")}]`);
        }
      }
      // Assert
      expect(failures, `未適合スキル:\n${failures.join("\n")}`).toEqual([]);
    });

    it("スキルディレクトリが 29 件存在する", () => {
      // Arrange / Act / Assert
      expect(skills.length).toBe(29);
    });
  });

  context("advisory 8 件が 3 セット（frontmatter/languageMetadata/purpose）で合格すること", () => {
    it("承認された 8 スキルが advisory として合格する", async () => {
      // Arrange
      const advisoryRequired = SkillStructure.forKind("advisory").requiredSections;
      const failures: string[] = [];
      // Act
      for (const name of ADVISORY_SKILLS) {
        const skillFilePath = path.join(SKILLS_ROOT, name, "SKILL.md");
        const result = await validator.validate(skillFilePath);
        const hasAllAdvisory = advisoryRequired.every((s) => result.actualSections.includes(s));
        if (!result.passed || !hasAllAdvisory) {
          failures.push(`${name}: passed=${result.passed} 欠落=[${result.missingSection.join(", ")}]`);
        }
      }
      // Assert
      expect(failures, `advisory 未適合:\n${failures.join("\n")}`).toEqual([]);
    });
  });

  context("advisory 宣言は固定 allowlist の 8 件に限定されること（allowlist pin）", () => {
    it("allowlist 外のスキルが kind: advisory を自己宣言していない", () => {
      // Arrange
      const advisorySet = new Set(ADVISORY_SKILLS);
      const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---/;
      const kindAdvisoryPattern = /^kind:\s*advisory\s*$/m;
      const offenders: string[] = [];
      // Act
      for (const skill of skills) {
        const raw = readFileSync(skill.skillFilePath, "utf8");
        const frontmatter = frontmatterPattern.exec(raw)?.[1] ?? "";
        if (kindAdvisoryPattern.test(frontmatter) && !advisorySet.has(skill.name)) {
          offenders.push(skill.name);
        }
      }
      // Assert: 9 件目の advisory 自己宣言はこのテストを fail させ、
      // allowlist（= ADVISORY_SKILLS）の意識的な変更を強制する
      expect(
        offenders,
        `固定 allowlist 外の advisory 自己宣言（lifecycle 要求の回避は禁止）:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });

    it("allowlist の 8 件全てが kind: advisory を宣言している", () => {
      // Arrange
      const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---/;
      const kindAdvisoryPattern = /^kind:\s*advisory\s*$/m;
      const missing: string[] = [];
      // Act
      for (const name of ADVISORY_SKILLS) {
        const raw = readFileSync(path.join(SKILLS_ROOT, name, "SKILL.md"), "utf8");
        const frontmatter = frontmatterPattern.exec(raw)?.[1] ?? "";
        if (!kindAdvisoryPattern.test(frontmatter)) {
          missing.push(name);
        }
      }
      // Assert
      expect(missing, `advisory 宣言漏れ:\n${missing.join("\n")}`).toEqual([]);
    });
  });

  context("lifecycle 21 件が 7 セクション全保有すること（anti-gutting）", () => {
    it("advisory 以外の全スキルが lifecycle 7 セクションを全て保有する", async () => {
      // Arrange
      const lifecycleRequired = SkillStructure.forKind("lifecycle").requiredSections;
      const advisorySet = new Set(ADVISORY_SKILLS);
      const failures: string[] = [];
      let lifecycleCount = 0;
      // Act
      for (const skill of skills) {
        if (advisorySet.has(skill.name)) continue;
        lifecycleCount += 1;
        const result = await validator.validate(skill.skillFilePath);
        const missing = lifecycleRequired.filter((s) => !result.actualSections.includes(s));
        if (missing.length > 0) {
          failures.push(`${skill.name}: 欠落=[${missing.join(", ")}]`);
        }
      }
      // Assert
      expect(failures, `lifecycle 未適合:\n${failures.join("\n")}`).toEqual([]);
      expect(lifecycleCount).toBe(21);
    });
  });
});
