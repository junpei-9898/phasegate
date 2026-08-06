/**
 * @layer domain
 * @unit quick-mode
 * @work-item-id WI-372
 *
 * QuickMode 設定の不変条件違反を表すエラー。
 *
 * `quick-mode-config.ts` と `category-override-rules.ts` の双方から参照されるため、
 * 循環 import を避ける目的で独立ファイルに切り出している。
 * 後方互換のため `quick-mode-config.ts` からも re-export される。
 */

export class QuickModeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuickModeConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
