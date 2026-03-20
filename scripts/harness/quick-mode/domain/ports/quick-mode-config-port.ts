/**
 * @layer domain
 * @unit quick-mode
 *
 * QuickModeConfig取得のドメインポート
 */

import type { QuickModeConfig } from '../value-objects/quick-mode-config.js';

export interface QuickModeConfigPort {
  getQuickModeConfig(): Promise<QuickModeConfig>;
}
