/**
 * @layer domain
 * @unit nyquist-validation
 *
 * StoryId一覧取得ポート
 */

export interface StoryRegistryPort {
  getValidStoryIds(): Promise<readonly string[]>;
}
