/**
 * @layer application
 * @unit adr-foundation
 */
import type { ADR } from '../../domain/aggregates/adr.js';
import { AdrFilePath } from '../../domain/value-objects/adr-file-path.js';
import type { AdrDetailDto } from '../dto/adr-detail-dto.js';

export function toAdrDetailDto(adr: ADR): Readonly<AdrDetailDto> {
  const frontmatter = adr.getFrontmatter();
  const body = adr.getBody();
  const archgate = adr.getArchgate();

  return Object.freeze({
    adrRef: adr.toAdrRef(),
    title: frontmatter.title,
    status: frontmatter.status.value,
    date: frontmatter.date,
    body: Object.freeze({
      context: body.context,
      decision: body.decision,
      consequences: body.consequences,
      alternatives: body.alternatives,
    }),
    archgate:
      archgate === undefined
        ? undefined
        : Object.freeze({
            enforcedBy: Object.freeze(
              archgate.enforcedBy.map((entry) =>
                Object.freeze({
                  validatorId: entry.validatorId,
                  errorCode: entry.errorCode,
                })
              )
            ),
          }),
    supersededBy: frontmatter.superseded_by,
    filePath: AdrFilePath.fromAdr(adr.id, frontmatter.title).toString(),
  });
}
