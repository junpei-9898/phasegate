/**
 * @layer domain
 * @unit quick-mode
 *
 * 変更ファイル一覧を取得するドメインポート
 */

import type { ChangedFile } from '../value-objects/changed-file.js';

export interface ChangedFilesPort {
  getChangedFiles(): Promise<readonly ChangedFile[]>;
}
