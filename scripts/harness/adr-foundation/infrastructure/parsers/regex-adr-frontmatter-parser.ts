/**
 * @layer infrastructure
 * @unit adr-foundation
 */
import type { AdrFrontmatterParserPort } from '../../domain/ports/adr-frontmatter-parser-port.js';
import { AdrFrontmatter } from '../../domain/value-objects/adr-frontmatter.js';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

type ParsedYaml = {
  adr_id?: string;
  title?: string;
  status?: string;
  date?: string;
  superseded_by?: string;
  archgate?: {
    enforced_by?: Array<{
      validator_id?: string;
      error_code?: string;
    }>;
  };
};

function parseYamlValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseSimpleYaml(raw: string): ParsedYaml {
  const result: ParsedYaml = {};
  const lines = raw.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    const topMatch = /^(\w[\w_]*):\s*(.*)$/.exec(line);
    if (!topMatch) {
      i++;
      continue;
    }

    const key = topMatch[1]!;
    const inlineValue = topMatch[2]!.trim();

    if (key === 'archgate') {
      const archgate: ParsedYaml['archgate'] = { enforced_by: [] };
      i++;

      // expect enforced_by:
      if (i < lines.length && /^\s+enforced_by:\s*$/.test(lines[i]!)) {
        i++;

        while (i < lines.length) {
          const entryLine = lines[i]!;
          const itemMatch = /^\s+-\s+validator_id:\s*(.+)$/.exec(entryLine);
          if (!itemMatch) break;

          const validatorId = parseYamlValue(itemMatch[1]!);
          i++;

          if (i < lines.length) {
            const errorMatch = /^\s+error_code:\s*(.+)$/.exec(lines[i]!);
            if (errorMatch) {
              archgate.enforced_by!.push({
                validator_id: validatorId,
                error_code: parseYamlValue(errorMatch[1]!),
              });
              i++;
            }
          }
        }
      }

      result.archgate = archgate;
      continue;
    }

    if (inlineValue.length > 0) {
      (result as Record<string, string>)[key] = parseYamlValue(inlineValue);
    }

    i++;
  }

  return result;
}

export class RegexAdrFrontmatterParser implements AdrFrontmatterParserPort {
  parseFrontmatter(raw: string): AdrFrontmatter {
    const match = FRONTMATTER_PATTERN.exec(raw);
    if (!match?.[1]) {
      throw new Error('YAML frontmatterが見つかりません');
    }

    const parsed = parseSimpleYaml(match[1]);

    return AdrFrontmatter.create({
      adr_id: parsed.adr_id,
      title: parsed.title,
      status: parsed.status,
      date: parsed.date,
      superseded_by: parsed.superseded_by,
      archgate: parsed.archgate?.enforced_by?.length
        ? {
            adr_id: parsed.adr_id,
            enforced_by: parsed.archgate.enforced_by.map((entry) => ({
              validator_id: entry.validator_id ?? '',
              error_code: entry.error_code ?? '',
            })),
          }
        : undefined,
    });
  }

  serializeFrontmatter(frontmatter: AdrFrontmatter): string {
    const primitives = frontmatter.toPrimitives();
    const lines: string[] = ['---'];

    lines.push(`adr_id: ${primitives.adr_id}`);
    lines.push(`title: ${primitives.title}`);
    lines.push(`status: ${primitives.status}`);
    lines.push(`date: ${primitives.date}`);

    if (primitives.superseded_by) {
      lines.push(`superseded_by: ${primitives.superseded_by}`);
    }

    if (primitives.archgate) {
      lines.push('archgate:');
      lines.push('  enforced_by:');
      for (const entry of primitives.archgate.enforced_by) {
        lines.push(`    - validator_id: ${entry.validator_id}`);
        lines.push(`      error_code: ${entry.error_code}`);
      }
    }

    lines.push('---');
    return lines.join('\n');
  }
}
