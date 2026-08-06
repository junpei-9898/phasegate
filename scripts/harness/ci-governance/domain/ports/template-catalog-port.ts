// @unit ci-governance
// @layer domain
// @work-item-id WI-367

import type { TemplateCatalogEntry } from "../value-objects/template-catalog-entry.js";
import type { TemplateName } from "../value-objects/template-name.js";

export interface TemplateCatalogPort {
  /** テンプレートディレクトリの絶対パス（案内表示用） */
  directoryPath(): string;

  /**
   * 実在するテンプレートを name 昇順で列挙する。
   * ディレクトリが存在しない場合は空配列を返す（例外にしない）。
   */
  list(): Promise<readonly TemplateCatalogEntry[]>;

  /**
   * catalog に name 完全一致するテンプレート本文を読む。
   * 一致するエントリが無い場合は null を返す。
   */
  read(name: TemplateName): Promise<string | null>;
}
