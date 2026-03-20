/**
 * @layer infrastructure
 * @unit adr-foundation
 */
import type { ADR } from '../../domain/aggregates/adr.js';
import type { AdrDocumentParserPort } from '../../domain/ports/adr-document-parser-port.js';
import type { AdrFrontmatterParserPort } from '../../domain/ports/adr-frontmatter-parser-port.js';
import type { AdrBody } from '../../domain/value-objects/adr-body.js';
import type { AdrFrontmatter } from '../../domain/value-objects/adr-frontmatter.js';
import { AdrBody as AdrBodyClass } from '../../domain/value-objects/adr-body.js';

const SECTION_HEADING_PATTERN = /^##\s+(.+)$/;

const HEADING_ALIASES: Readonly<Record<string, 'Context' | 'Decision' | 'Consequences' | 'Alternatives'>> = {
  Context: 'Context',
  Decision: 'Decision',
  Consequences: 'Consequences',
  Alternatives: 'Alternatives',
  'コンテキスト': 'Context',
  '決定': 'Decision',
  '結果': 'Consequences',
  '代替案': 'Alternatives',
};

export class AdrMarkdownDocumentParser implements AdrDocumentParserPort {
  private readonly frontmatterParser: AdrFrontmatterParserPort;

  constructor(frontmatterParser: AdrFrontmatterParserPort) {
    this.frontmatterParser = frontmatterParser;
  }

  parseDocument(rawMarkdown: string): {
    frontmatter: AdrFrontmatter;
    body: AdrBody;
  } {
    const frontmatter = this.frontmatterParser.parseFrontmatter(rawMarkdown);

    const bodyText = this.extractBody(rawMarkdown);
    const sectionMap = this.parseSections(bodyText);

    const body = AdrBodyClass.create({
      context: sectionMap.Context,
      decision: sectionMap.Decision,
      consequences: sectionMap.Consequences,
      alternatives: sectionMap.Alternatives,
    });

    return { frontmatter, body };
  }

  serializeDocument(adr: ADR): string {
    const frontmatterYaml = this.frontmatterParser.serializeFrontmatter(adr.getFrontmatter());
    const title = adr.getFrontmatter().title;
    const sections = adr.getBody().toSectionMap();

    const lines: string[] = [frontmatterYaml, '', `# ${title}`];

    const canonicalOrder: Array<'Context' | 'Decision' | 'Consequences' | 'Alternatives'> = [
      'Context',
      'Decision',
      'Consequences',
      'Alternatives',
    ];

    for (const sectionName of canonicalOrder) {
      const content = sections[sectionName];
      if (content !== undefined) {
        lines.push('', `## ${sectionName}`, '', content);
      }
    }

    return lines.join('\n') + '\n';
  }

  private extractBody(rawMarkdown: string): string {
    const closingIndex = rawMarkdown.indexOf('---', rawMarkdown.indexOf('---') + 3);
    if (closingIndex === -1) {
      return rawMarkdown;
    }

    return rawMarkdown.slice(closingIndex + 3).trim();
  }

  private parseSections(bodyText: string): Record<string, string | undefined> {
    const lines = bodyText.split(/\r?\n/);
    const sectionMap: Record<string, string | undefined> = {};

    let currentSection: string | null = null;
    const sectionLines: string[] = [];

    const flushSection = (): void => {
      if (currentSection !== null) {
        sectionMap[currentSection] = sectionLines.join('\n').trim();
        sectionLines.length = 0;
      }
    };

    for (const line of lines) {
      if (/^#\s+/.test(line)) {
        continue;
      }

      const headingMatch = SECTION_HEADING_PATTERN.exec(line);
      if (headingMatch) {
        flushSection();
        const heading = headingMatch[1]!.trim();
        const canonical = HEADING_ALIASES[heading];
        currentSection = canonical ?? heading;
        continue;
      }

      if (currentSection !== null) {
        sectionLines.push(line);
      }
    }

    flushSection();

    return sectionMap;
  }
}
