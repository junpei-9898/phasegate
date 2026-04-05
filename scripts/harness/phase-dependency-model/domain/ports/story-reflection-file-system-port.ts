/**
 * @layer domain
 * @unit phase-dependency-model
 */

export interface StoryReflectionFileSystemPort {
  /** inception/{unit}/ 配下の storyId ディレクトリ名一覧を返す */
  listStoryDirectories(unitId: string): Promise<readonly string[]>;
  /** ファイルの存在チェック */
  fileExists(path: string): Promise<boolean>;
  /** product 文書内に @story-id {storyId} アノテーションが含まれているか */
  fileContainsStoryAnnotation(
    productPath: string,
    storyId: string,
  ): Promise<boolean>;
}
