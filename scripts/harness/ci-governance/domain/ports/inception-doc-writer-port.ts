// @unit ci-governance
// @layer domain
// @work-item-id WI-368

import type { InceptionDocKind } from "../value-objects/inception-doc-kind.js";

export interface InceptionDocWriterPort {
  /** 書き込み先の絶対パスを返す（副作用なし） */
  resolvePath(kind: InceptionDocKind): string;

  /** 書き込み先が既に存在するか */
  exists(kind: InceptionDocKind): Promise<boolean>;

  /**
   * inception / product 文書を書き込む（親ディレクトリが無ければ作成）。
   * 書き込んだ絶対パスを返す。
   */
  write(kind: InceptionDocKind, content: string): Promise<string>;
}
