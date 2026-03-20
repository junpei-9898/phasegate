/**
 * @layer application
 * @unit adr-foundation
 */
import { ADR } from '../../domain/aggregates/adr.js';
import type { AdrDocumentParserPort } from '../../domain/ports/adr-document-parser-port.js';
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import { AdrValidationService } from '../../domain/services/adr-validation-service.js';
import { AdrFilePath } from '../../domain/value-objects/adr-file-path.js';
import type { AdrTemplateDto } from '../dto/adr-template-dto.js';
import {
  InvalidAdrDateError,
  TemplateOutputConflictError,
} from '../dto/application-errors.js';

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export interface CreateAdrTemplateInput {
  readonly title?: string;
  readonly date?: string;
  readonly status?: 'Proposed' | 'Accepted';
  readonly includeArchgateExample?: boolean;
}

export class CreateAdrTemplateUseCase {
  constructor(
    private readonly adrRepository: AdrRepositoryPort,
    private readonly documentParser: AdrDocumentParserPort,
  ) {}

  async execute(input: CreateAdrTemplateInput): Promise<Readonly<AdrTemplateDto>> {
    const adrId = await this.adrRepository.nextId();
    const title = input.title?.trim() || 'Short decision title';
    const status = input.status ?? 'Proposed';
    const date = input.date ?? new Date().toISOString().slice(0, 10);

    if (!DATE_PATTERN.test(date)) {
      throw new InvalidAdrDateError(date);
    }

    const filePath = AdrFilePath.fromAdr(adrId, title).toString();
    if (await this.adrRepository.exists(adrId)) {
      throw new TemplateOutputConflictError(filePath);
    }

    const adr = ADR.create(
      {
        adr_id: adrId.value,
        title,
        status,
        date,
        archgate: input.includeArchgateExample
          ? {
              adr_id: adrId.value,
              enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
            }
          : undefined,
      },
      {
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
        alternatives: 'Alternatives',
      },
      new AdrValidationService(),
    );

    const markdown = this.documentParser.serializeDocument(adr);
    const archgate = adr.getArchgate();

    return Object.freeze({
      adrRef: adr.toAdrRef(),
      filePath,
      recommendedPath: filePath,
      markdown,
      frontmatterDefaults: Object.freeze({
        adrId: adrId.value,
        title,
        status,
        date,
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
      }),
    });
  }
}
