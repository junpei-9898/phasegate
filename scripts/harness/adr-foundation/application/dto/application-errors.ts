/**
 * @layer application
 * @unit adr-foundation
 */
export class AdrNotFoundApplicationError extends Error {
  constructor(adrRef: string) {
    super(`指定されたADRが見つかりません: ${adrRef}`);
    this.name = 'AdrNotFoundApplicationError';
  }
}

export class DuplicateAdrIdApplicationError extends Error {
  constructor(adrRef: string) {
    super(`ADR ID が重複しています: ${adrRef}`);
    this.name = 'DuplicateAdrIdApplicationError';
  }
}

export class SupersededTargetNotFoundApplicationError extends Error {
  constructor(adrRef: string) {
    super(`superseded_by の参照先ADRが存在しません: ${adrRef}`);
    this.name = 'SupersededTargetNotFoundApplicationError';
  }
}

export class SupersededByRequiredApplicationError extends Error {
  constructor() {
    super('supersede 実行時は supersededBy が必須です');
    this.name = 'SupersededByRequiredApplicationError';
  }
}

export class ArchgateSearchConditionRequiredError extends Error {
  constructor() {
    super('validatorId または errorCode の少なくとも一方を指定してください');
    this.name = 'ArchgateSearchConditionRequiredError';
  }
}

export class TemplateOutputConflictError extends Error {
  constructor(filePath: string) {
    super(`テンプレート出力先が既存ADRと衝突しています: ${filePath}`);
    this.name = 'TemplateOutputConflictError';
  }
}

export class InvalidAdrDateError extends Error {
  constructor(date: string) {
    super(`ADR日付は YYYY-MM-DD 形式で指定してください: ${date}`);
    this.name = 'InvalidAdrDateError';
  }
}

export class SeedAdrDefinitionCountError extends Error {
  constructor(actualCount: number) {
    super(`初期ADR定義は11件である必要があります: ${actualCount}`);
    this.name = 'SeedAdrDefinitionCountError';
  }
}
