/**
 * @layer domain
 * @unit validator-system
 *
 * ValidatorRegistry ドメインサービス
 * L2-L4バリデータ定義のカタログ管理と選択実行インターフェース
 */
import { ValidatorId } from '../value-objects/validator-id.js';
import { ValidatorDefinition } from '../value-objects/validator-definition.js';

export class UnknownValidatorError extends Error {
  readonly validatorId: string;
  constructor(validatorId: string) {
    super(`Unknown validator: "${validatorId}". Not registered in ValidatorRegistry.`);
    this.name = 'UnknownValidatorError';
    this.validatorId = validatorId;
  }
}

export class ValidatorRegistry {
  private readonly definitionMap: Map<string, ValidatorDefinition>;
  private readonly definitionList: readonly ValidatorDefinition[];

  constructor(definitions: readonly ValidatorDefinition[]) {
    const map = new Map<string, ValidatorDefinition>();
    for (const def of definitions) {
      const key = def.validatorId.value;
      if (map.has(key)) {
        throw new Error(`ValidatorRegistry: duplicate validatorId "${key}". Each validatorId must be unique.`);
      }
      map.set(key, def);
    }
    this.definitionMap = map;
    this.definitionList = Object.freeze(
      [...definitions].sort((a, b) => a.validatorId.value.localeCompare(b.validatorId.value))
    );
  }

  getDefinition(validatorId: ValidatorId): ValidatorDefinition {
    const def = this.definitionMap.get(validatorId.value);
    if (!def) {
      throw new UnknownValidatorError(validatorId.value);
    }
    return def;
  }

  getAllDefinitions(): readonly ValidatorDefinition[] {
    return this.definitionList;
  }

  listByLayer(layer: 'L2' | 'L3' | 'L4'): readonly ValidatorDefinition[] {
    return this.definitionList.filter((def) => def.layer === layer);
  }

  select(validatorIds: readonly ValidatorId[]): readonly ValidatorDefinition[] {
    return validatorIds.map((id) => this.getDefinition(id));
  }

  hasDefinition(validatorId: ValidatorId): boolean {
    return this.definitionMap.has(validatorId.value);
  }
}
