/**
 * @layer infrastructure
 * @unit harness-error
 */
import { InvalidErrorDefinitionError } from '../../domain/errors/invalid-error-definition-error.js';
import { ErrorDefinitionRegistry } from '../../domain/services/error-definition-registry.js';
import type { ErrorDefinition } from '../../domain/value-objects/error-definition.js';

function flattenDefinitions(
  definitions: readonly (readonly ErrorDefinition[])[]
): readonly ErrorDefinition[] {
  return definitions.flat();
}

function assertStartupInvariants(definitions: readonly ErrorDefinition[]): void {
  for (const definition of definitions) {
    if (definition.adrRefRequired && definition.defaultAdrRef === null) {
      throw new InvalidErrorDefinitionError(
        `adrRefRequired=true のため defaultAdrRef が必須です: ${definition.code.toString()}`
      );
    }

    if (
      definition.fixExampleRequired &&
      definition.defaultFixExample === null
    ) {
      throw new InvalidErrorDefinitionError(
        `fixExampleRequired=true のため defaultFixExample が必須です: ${definition.code.toString()}`
      );
    }
  }
}

export function buildErrorDefinitionRegistry(
  definitions: readonly (readonly ErrorDefinition[])[]
): ErrorDefinitionRegistry {
  const flattenedDefinitions = flattenDefinitions(definitions);
  assertStartupInvariants(flattenedDefinitions);
  return new ErrorDefinitionRegistry(flattenedDefinitions);
}
