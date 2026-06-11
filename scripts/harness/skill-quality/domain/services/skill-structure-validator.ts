/**
 * @layer domain
 * @unit skill-quality
 * @work-item-id WI-212
 */
import { SkillStructure } from '../value-objects/skill-structure.js';
import { SkillValidationResult } from '../value-objects/skill-validation-result.js';
import type { SkillFileReaderPort } from '../ports/skill-file-reader-port.js';
import type { SectionName } from '../types/section-name.js';

export class SkillStructureValidator {
  constructor(private readonly skillFileReaderPort: SkillFileReaderPort) {}

  async validate(skillFilePath: string): Promise<SkillValidationResult> {
    const rawContent = await this.skillFileReaderPort.read(skillFilePath);
    const actualSections = this.extractSections(rawContent);
    const structure = SkillStructure.default();
    const missingSections = structure.getMissingSections(actualSections);

    if (missingSections.length === 0) {
      return SkillValidationResult.passed(actualSections);
    }
    return SkillValidationResult.failed(missingSections, actualSections);
  }

  private extractSections(content: string): readonly SectionName[] {
    const sections: SectionName[] = [];
    const lines = content.split('\n');

    // Check for frontmatter (YAML between --- delimiters)
    if (lines[0]?.trim() === '---') {
      sections.push('frontmatter');
      if (this.hasLanguageMetadata(lines)) {
        sections.push('languageMetadata');
      }
    }

    // Look for headings that correspond to section names
    // Keys are lowercased prefix strings; matching uses startsWith to handle parenthetical suffixes
    const sectionMap: ReadonlyArray<readonly [string, SectionName]> = [
      // 汎用形式（英語・シンプル日本語）
      ['purpose', 'purpose'],
      ['目的', 'purpose'],
      ['inputs', 'inputs'],
      ['入力', 'inputs'],
      ['outputs', 'outputs'],
      ['出力', 'outputs'],
      ['prerequisites', 'prerequisites'],
      ['前提条件', 'prerequisites'],
      ['executionflow', 'executionFlow'],
      ['実行フロー', 'executionFlow'],
      // SKILL.md フォーマット（AIDLCスキルで実際に使用されている見出し）
      ['必須インプット', 'inputs'],
      ['任意インプット', 'inputs'],
      ['推奨インプット', 'inputs'],
      ['出力ファイル', 'outputs'],
      ['前提条件チェック', 'prerequisites'],
      ['⚠️ 2フェーズ実行ルール', 'executionFlow'],
      ['⚠️ 3フェーズ実行ルール', 'executionFlow'],
    ];

    for (const line of lines) {
      const headingMatch = /^#{1,6}\s+(.+)$/.exec(line);
      if (headingMatch) {
        const headingText = headingMatch[1]?.trim().toLowerCase() ?? '';
        const entry = sectionMap.find(([key]) => headingText.startsWith(key));
        const sectionName = entry?.[1];
        if (sectionName && !sections.includes(sectionName)) {
          sections.push(sectionName);
        }
      }
    }

    return sections;
  }

  private hasLanguageMetadata(lines: readonly string[]): boolean {
    const closingDelimiterIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (closingDelimiterIndex < 0) return false;

    const frontmatterLines = lines.slice(1, closingDelimiterIndex);
    const languageLineIndex = frontmatterLines.findIndex((line) => /^\s*languages\s*:/.test(line));
    if (languageLineIndex < 0) return false;

    const languageLine = frontmatterLines[languageLineIndex] ?? '';
    if (/\[[^\]]*\S[^\]]*\]/.test(languageLine)) return true;

    return frontmatterLines.slice(languageLineIndex + 1).some((line) => {
      if (/^\S/.test(line)) return false;
      return /^\s*-\s*\S+/.test(line);
    });
  }
}
