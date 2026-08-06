// @unit ci-governance
// @layer domain
// @work-item-id WI-367

/**
 * テンプレート識別子。**ファイルパスではない**。
 *
 * `phasegate templates show <name>` の `<name>` を受け取る第一防壁。
 * `..` / `/` / `\` を含む入力をここで弾くが、これは最終防壁ではない。
 * 最終防壁は `TemplateCatalogPort` が readdir した実ファイル名との完全一致照合であり、
 * ユーザー入力文字列が `path.join` の引数になる経路を持たないことで
 * path traversal を構造的に不能にする。
 */
const TEMPLATE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export class InvalidTemplateNameError extends Error {
  constructor(input: string) {
    super(`テンプレート名が不正です: "${input}"（使用可能: 英小文字・数字・_ ・-）`);
    this.name = "InvalidTemplateNameError";
  }
}

export class TemplateName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(input: string): TemplateName {
    if (!TemplateName.isValid(input)) {
      throw new InvalidTemplateNameError(input);
    }
    return new TemplateName(input);
  }

  static isValid(input: string): boolean {
    if (typeof input !== "string") return false;
    return TEMPLATE_NAME_PATTERN.test(input);
  }

  equals(other: TemplateName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
