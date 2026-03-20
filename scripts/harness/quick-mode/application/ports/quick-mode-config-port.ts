/**
 * @layer application
 * @unit quick-mode
 *
 * Application層のQuickModeConfigPort
 * UT-JUC テストでの getConfig メソッド名に対応するため独自定義
 */

import type { QuickModeConfig } from '../../domain/value-objects/quick-mode-config.js';

export interface QuickModeConfigPort {
  getConfig(): QuickModeConfig | Promise<QuickModeConfig>;
}
