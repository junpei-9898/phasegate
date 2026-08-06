// @unit ci-governance
// @layer domain
// @work-item-id WI-368

import type { InceptionDocKind } from "../value-objects/inception-doc-kind.js";

export interface InceptionTemplateRepositoryPort {
  /** テンプレートの絶対パスを返す（UI 出力用） */
  resolvePath(kind: InceptionDocKind): string;

  /**
   * kind に対応するテンプレートファイルを読み込む。
   * 存在しない場合は例外を投げる。
   */
  read(kind: InceptionDocKind): Promise<string>;
}
