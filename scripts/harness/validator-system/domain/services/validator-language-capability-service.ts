/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-212
 */
import type { ValidatorId } from '../value-objects/validator-id.js';
import { ValidationResult } from '../value-objects/validation-result.js';
import type { ValidatorDefinition } from '../value-objects/validator-definition.js';

const DEFAULT_SUPPORTED_LANGUAGES = ['typescript'] as const;

const VALIDATOR_LANGUAGE_CAPABILITIES: Readonly<Record<string, readonly string[]>> = {
  'L3-002': DEFAULT_SUPPORTED_LANGUAGES,
  'L3-003': DEFAULT_SUPPORTED_LANGUAGES,
  'L4-003': DEFAULT_SUPPORTED_LANGUAGES,
};

export class ValidatorLanguageCapabilityService {
  getUnsupportedValidatorIds(
    validatorIds: readonly ValidatorId[],
    projectLanguages: readonly string[],
  ): ReadonlySet<string> {
    const normalizedProjectLanguages = new Set(projectLanguages.map((language) => language.toLowerCase()));
    const unsupportedIds = validatorIds
      .filter((validatorId) => {
        const supportedLanguages = VALIDATOR_LANGUAGE_CAPABILITIES[validatorId.value];
        if (!supportedLanguages) return false;
        return !supportedLanguages.some((language) => normalizedProjectLanguages.has(language));
      })
      .map((validatorId) => validatorId.value);

    return new Set(unsupportedIds);
  }

  splitDefinitions(
    definitions: readonly ValidatorDefinition[],
    projectLanguages: readonly string[],
  ): {
    readonly executableDefinitions: readonly ValidatorDefinition[];
    readonly unsupportedResults: readonly ValidationResult[];
    readonly unsupportedValidatorIds: ReadonlySet<string>;
  } {
    const unsupportedValidatorIds = this.getUnsupportedValidatorIds(
      definitions.map((definition) => definition.validatorId),
      projectLanguages,
    );
    const executableDefinitions = definitions.filter(
      (definition) => !unsupportedValidatorIds.has(definition.validatorId.value),
    );
    const unsupportedResults = definitions
      .filter((definition) => unsupportedValidatorIds.has(definition.validatorId.value))
      .map((definition) => ValidationResult.skipWithReason(
        definition.validatorId,
        this.createSkipReason(definition.validatorId, projectLanguages),
      ));

    return { executableDefinitions, unsupportedResults, unsupportedValidatorIds };
  }

  private createSkipReason(validatorId: ValidatorId, projectLanguages: readonly string[]): string {
    const supportedLanguages = VALIDATOR_LANGUAGE_CAPABILITIES[validatorId.value] ?? DEFAULT_SUPPORTED_LANGUAGES;
    return `unsupported-language: ${validatorId.value} currently supports ${supportedLanguages.join(', ')}; project languages are ${projectLanguages.join(', ')}`;
  }
}
