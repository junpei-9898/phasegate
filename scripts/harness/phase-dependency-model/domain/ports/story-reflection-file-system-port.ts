// @unit phase-dependency-model
// @layer domain

export interface StoryReflectionFileSystemPort {
  listStoryDirectories(unitId: string): Promise<readonly string[]>;
  fileExists(path: string): Promise<boolean>;
  /** product 文書内に @story-id {storyId} アノテーションが含まれているか */
  fileContainsStoryAnnotation(
    productPath: string,
    storyId: string,
  ): Promise<boolean>;
}
