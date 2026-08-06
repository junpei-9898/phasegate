// @unit ci-governance
// @layer domain
// @work-item-id WI-367

import { TemplateName } from "./template-name.js";

/** `<name>.template.<ext>` 形式のテンプレートファイル名を分解する */
const TEMPLATE_FILE_PATTERN = /^(.+)\.template\.([a-z0-9]+)$/;

export interface TemplateCatalogEntryProps {
  readonly name: TemplateName;
  readonly fileName: string;
  readonly extension: string;
}

/**
 * `templates/` 配下に実在する 1 テンプレートの記述子。
 *
 * `fileName` は readdir が返した実ファイル名であり、ユーザー入力を含まない。
 * `templates show` はこのエントリを `name` で完全一致検索し、
 * 見つかった `fileName` のみをテンプレートディレクトリに join する。
 */
export class TemplateCatalogEntry {
  readonly name: TemplateName;
  readonly fileName: string;
  readonly extension: string;

  private constructor(props: TemplateCatalogEntryProps) {
    this.name = props.name;
    this.fileName = props.fileName;
    this.extension = props.extension;
    Object.freeze(this);
  }

  /**
   * テンプレートファイル名からエントリを生成する。
   * `<name>.template.<ext>` 形式でない、または name 部分が
   * `TemplateName` の不変条件を満たさない場合は null を返す（catalog から除外される）。
   */
  static fromFileName(fileName: string): TemplateCatalogEntry | null {
    const matched = TEMPLATE_FILE_PATTERN.exec(fileName);
    if (matched === null) return null;

    const [, rawName, extension] = matched;
    if (!TemplateName.isValid(rawName)) return null;

    return new TemplateCatalogEntry({
      name: TemplateName.create(rawName),
      fileName,
      extension,
    });
  }
}
