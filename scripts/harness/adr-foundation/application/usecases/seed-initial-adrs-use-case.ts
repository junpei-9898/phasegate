/**
 * @layer application
 * @unit adr-foundation
 */
import { ADR } from '../../domain/aggregates/adr.js';
import type { AdrDocumentParserPort } from '../../domain/ports/adr-document-parser-port.js';
import type { AdrRepositoryPort } from '../../domain/ports/adr-repository-port.js';
import { AdrValidationService } from '../../domain/services/adr-validation-service.js';
import { AdrId } from '../../domain/value-objects/adr-id.js';
import {
  DuplicateAdrIdApplicationError,
  SeedAdrDefinitionCountError,
} from '../dto/application-errors.js';
import type { SeedAdrDefinition } from '../dto/seed-adr-definition.js';

export interface SeedInitialAdrsInput {
  readonly definitions: SeedAdrDefinition[];
  readonly overwrite?: boolean;
}

export interface SeedInitialAdrsOutput {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
}

export class SeedInitialAdrsUseCase {
  constructor(
    private readonly adrRepository: AdrRepositoryPort,
    private readonly documentParser: AdrDocumentParserPort,
  ) {}

  async execute(input: SeedInitialAdrsInput): Promise<Readonly<SeedInitialAdrsOutput>> {
    if (input.definitions.length !== 11) {
      throw new SeedAdrDefinitionCountError(input.definitions.length);
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const [index, definition] of input.definitions.entries()) {
      const adrId = AdrId.create(String(index + 1).padStart(3, '0'));
      const adrRef = adrId.toAdrRef();

      if (created.includes(adrRef) || skipped.includes(adrRef)) {
        throw new DuplicateAdrIdApplicationError(adrRef);
      }

      const adr = ADR.create(
        {
          adr_id: adrId.value,
          title: definition.title,
          status: definition.status,
          date: definition.date,
          archgate: definition.archgate
            ? {
                adr_id: adrId.value,
                enforced_by: definition.archgate.enforcedBy.map((entry) => ({
                  validator_id: entry.validatorId,
                  error_code: entry.errorCode,
                })),
              }
            : undefined,
        },
        definition.body,
        new AdrValidationService(),
      );

      const exists = await this.adrRepository.exists(adrId);
      if (exists && input.overwrite !== true) {
        skipped.push(adrRef);
        continue;
      }

      this.documentParser.serializeDocument(adr);
      await this.adrRepository.save(adr);
      created.push(adrRef);
    }

    return Object.freeze({
      created: Object.freeze(created),
      skipped: Object.freeze(skipped),
    });
  }
}
