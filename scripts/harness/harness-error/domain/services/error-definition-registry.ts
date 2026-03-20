/**
 * @layer domain
 * @unit harness-error
 *
 * ErrorDefinitionRegistry ドメインサービス
 * code 単位の正規定義カタログ。人間可読情報、severity 契約、ADR/fix_example 必須性を一元管理する
 */
import { DuplicateErrorCodeError } from '../errors/duplicate-error-code-error.js';
import { UnknownErrorDefinitionError } from '../errors/unknown-error-definition-error.js';
import type { ErrorCode } from '../value-objects/error-code.js';
import type { ErrorDefinition } from '../value-objects/error-definition.js';

export class ErrorDefinitionRegistry {
  private readonly definitionMap: Map<string, ErrorDefinition>;
  private readonly sortedDefinitions: readonly ErrorDefinition[];

  constructor(definitions: readonly ErrorDefinition[]) {
    this.definitionMap = new Map();

    for (const definition of definitions) {
      const key = definition.code.toString();
      if (this.definitionMap.has(key)) {
        throw new DuplicateErrorCodeError(key);
      }
      this.definitionMap.set(key, definition);
    }

    const sorted = [...definitions].sort((a, b) =>
      a.code.toString().localeCompare(b.code.toString())
    );
    this.sortedDefinitions = Object.freeze(sorted);
  }

  getDefinition(code: ErrorCode): ErrorDefinition {
    const definition = this.definitionMap.get(code.toString());
    if (!definition) {
      throw new UnknownErrorDefinitionError(code.toString());
    }
    return definition;
  }

  getAllDefinitions(): readonly ErrorDefinition[] {
    return this.sortedDefinitions;
  }

  listByValidator(validatorId: string): readonly ErrorDefinition[] {
    return this.sortedDefinitions.filter(
      (d) => d.ownerValidatorId === validatorId
    );
  }

  listByLayer(layer: number): readonly ErrorDefinition[] {
    return this.sortedDefinitions.filter((d) => d.code.layer === layer);
  }

  hasDefinition(code: ErrorCode): boolean {
    return this.definitionMap.has(code.toString());
  }
}
