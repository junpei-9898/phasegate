/**
 * @layer domain
 * @unit ci-governance
 * @work-item-id WI-331
 */

export interface ClaudeMdTemplateValues {
  readonly commands: readonly string[];
  readonly skills: readonly string[];
  readonly presets: readonly string[];
}

const USER_SECTION_START = "<!-- phasegate:user-section:start -->";
const USER_SECTION_END = "<!-- phasegate:user-section:end -->";
const DEFAULT_USER_SECTION = "Project-specific agent instructions go here.";

export class ClaudeMdComposer {
  // Rebuilds CLAUDE.md from the current template, carrying over the existing
  // user-section body. Because the whole file is re-rendered, a legacy file
  // whose user-section still sits inside the managed block (pre-WI-331
  // template shape) is migrated to the current outside-of-block structure.
  compose(template: string, existing: string | null, values: ClaudeMdTemplateValues): string {
    const userSection = this.extractUserSection(existing) ?? DEFAULT_USER_SECTION;
    const rendered = template
      .replace("{{PHASEGATE_COMMANDS}}", this.toList(values.commands))
      .replace("{{PHASEGATE_SKILLS}}", this.toList(values.skills))
      .replace("{{PHASEGATE_PRESETS}}", this.toList(values.presets))
      // Collapse blank-line runs before injecting the user body so
      // user-authored spacing is preserved byte-for-byte.
      .replace(/\n{3,}/g, "\n\n")
      // Replacer function keeps `$`-sequences in the user body from being
      // interpreted as String.replace substitution patterns.
      .replace("{{PHASEGATE_USER_SECTION}}", () => userSection);
    return `${rendered.trimEnd()}\n`;
  }

  private extractUserSection(existing: string | null): string | null {
    if (existing === null) return null;
    const start = existing.indexOf(USER_SECTION_START);
    const end = existing.indexOf(USER_SECTION_END);
    if (start === -1 || end === -1 || end < start) return existing.trim();
    return existing.slice(start + USER_SECTION_START.length, end).trim();
  }

  private toList(values: readonly string[]): string {
    return values.map((value) => `- \`${value}\``).join("\n");
  }
}
