// @unit phase-dependency-model
// @layer domain

export interface StoryReflectionFileSystemPort {
  listStoryDirectories(unitId: string): Promise<readonly string[]>;
  storyAffectsUnit(storyId: string, unitId: string): Promise<boolean>;
  /** WI のコミット（Work-Item trailer）が scripts/harness/{unitId}/{layer}/ 配下のソースを変更したか */
  storyTouchesUnitLayer(storyId: string, unitId: string, layer: string): Promise<boolean>;
  fileExists(path: string): Promise<boolean>;
  /** product 文書内に @story-id {storyId} アノテーションが含まれているか */
  fileContainsStoryAnnotation(productPath: string, storyId: string): Promise<boolean>;
}
