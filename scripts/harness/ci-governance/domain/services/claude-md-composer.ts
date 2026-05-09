/**
 * @layer domain
 * @unit ci-governance
 */

export interface ClaudeMdTemplateValues {
  readonly commands: readonly string[];
  readonly skills: readonly string[];
  readonly presets: readonly string[];
}

const USER_SECTION_START = '<!-- phasegate:user-section:start -->';
const USER_SECTION_END = '<!-- phasegate:user-section:end -->';
const DEFAULT_USER_SECTION = 'プロジェクト固有の指示をここに記載してください。';

export class ClaudeMdComposer {
  compose(template: string, existing: string | null, values: ClaudeMdTemplateValues): string {
    const userSection = this.extractUserSection(existing) ?? DEFAULT_USER_SECTION;
    return template
      .replace('{{PHASEGATE_COMMANDS}}', this.toList(values.commands))
      .replace('{{PHASEGATE_SKILLS}}', this.toList(values.skills))
      .replace('{{PHASEGATE_PRESETS}}', this.toList(values.presets))
      .replace('{{PHASEGATE_USER_SECTION}}', userSection)
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n';
  }

  private extractUserSection(existing: string | null): string | null {
    if (existing === null) return null;
    const start = existing.indexOf(USER_SECTION_START);
    const end = existing.indexOf(USER_SECTION_END);
    if (start === -1 || end === -1 || end < start) return existing.trim();
    return existing.slice(start + USER_SECTION_START.length, end).trim();
  }

  private toList(values: readonly string[]): string {
    return values.map((value) => `- \`${value}\``).join('\n');
  }
}
