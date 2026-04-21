// @unit ci-governance
// @layer domain

import type { DesignPhase } from '../value-objects/design-phase.js';

export interface TemplateRepositoryPort {
  /**
   * 指定した phase に対応するテンプレートファイルを読み込む。
   * 存在しない場合は例外を投げる。
   */
  read(phase: DesignPhase): Promise<string>;

  /** テンプレートの絶対パスを返す（UI 出力用） */
  resolvePath(phase: DesignPhase): string;
}
