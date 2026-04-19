// @unit <UNIT_NAME>
// @layer test
// @story <STORY_ID>

/**
 * phasegate テストファイルテンプレート
 *
 * 使い方:
 *   1. `<UNIT_NAME>` を被テスト実装と同じ Unit ID に置換
 *   2. `<STORY_ID>` を本テストがカバーする User Story ID に置換
 *      （例: H03-02。複数カバーする場合は `H03-01, H03-02` のようにカンマ区切り）
 *   3. `<TestSubject>` を対象のクラス / 関数名に置換
 *   4. `target` / `context` は project の test-helpers から import される describe エイリアス
 *
 * このメタデータは `MetadataValidator.validateTest` で検証される:
 *   - `@story` が存在すること
 *   - `HXX-XX` 形式であること
 *   - `docs/product/user_stories.md`（StoryCatalog）に存在する ID であること
 *
 * pre-commit 経路で自動チェックされる（ISSUE-008 Phase C-3）。
 */

import { describe, expect, it } from 'vitest';
import { target, context } from '../helpers/test-helpers.js';

target('<TestSubject>', () => {
  context('<前提条件・シナリオ>', () => {
    it('<期待される挙動を日本語で記述>', () => {
      // Arrange
      const input = 'TODO';
      // Act
      const actual = input;
      // Assert
      expect(actual).toBe('TODO');
    });
  });
});
