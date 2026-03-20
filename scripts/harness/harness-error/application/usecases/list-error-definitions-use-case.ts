/**
 * @layer application
 * @unit harness-error
 *
 * error definitionカタログを列挙するUseCase
 */
import type { ErrorDefinitionSummary } from '../dto/error-definition-summary.js';
import type { ListErrorDefinitionsQuery } from '../dto/list-error-definitions-query.js';
import type { ErrorDefinitionRegistry } from '../../domain/services/error-definition-registry.js';

export interface ListErrorDefinitionsUseCaseDeps {
  readonly errorDefinitionRegistry: ErrorDefinitionRegistry;
}

export class ListErrorDefinitionsUseCase {
  private readonly errorDefinitionRegistry: ErrorDefinitionRegistry;

  constructor(deps: ListErrorDefinitionsUseCaseDeps) {
    this.errorDefinitionRegistry = deps.errorDefinitionRegistry;
  }

  async execute(
    query: ListErrorDefinitionsQuery
  ): Promise<readonly Readonly<ErrorDefinitionSummary>[]> {
    const summaries = this.errorDefinitionRegistry
      .getAllDefinitions()
      .filter((definition) => {
        if (query.layer !== undefined && definition.code.layer !== Number(query.layer[1])) {
          return false;
        }
        if (
          query.validatorId !== undefined &&
          definition.ownerValidatorId !== query.validatorId
        ) {
          return false;
        }
        if (query.category !== undefined && definition.category !== query.category) {
          return false;
        }
        return true;
      })
      .map<Readonly<ErrorDefinitionSummary>>((definition) =>
        Object.freeze({
          code: definition.code.toString(),
          title: definition.title,
          category: definition.category,
          defaultSeverity: definition.defaultSeverity.toString(),
          adrRefRequired: definition.adrRefRequired,
          fixExampleRequired: definition.fixExampleRequired,
          validatorId: definition.ownerValidatorId,
        })
      );

    return Object.freeze(summaries);
  }
}
