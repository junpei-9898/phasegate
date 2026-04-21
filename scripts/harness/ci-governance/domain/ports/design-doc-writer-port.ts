// @unit ci-governance
// @layer domain

import type { DesignPhase } from '../value-objects/design-phase.js';

export interface DesignDocWriterPort {
  /** 書き込み先の絶対パスを返す（副作用なし） */
  resolvePath(unit: string, phase: DesignPhase): string;

  /** 書き込み先が既に存在するか */
  exists(unit: string, phase: DesignPhase): Promise<boolean>;

  /**
   * 設計文書を書き込む（親ディレクトリが無ければ作成）。
   * 書き込んだ絶対パスを返す。
   */
  write(unit: string, phase: DesignPhase, content: string): Promise<string>;
}
