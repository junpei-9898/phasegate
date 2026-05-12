# WI-125 Domain Model

<!-- @work-item-id WI-125 -->

## Model

`RequirementTestMatrixGeneration` は product docs の AC と test metadata を突き合わせ、既存 matrix を壊さずに `requirement-test-matrix.json` を生成する。

| Model | Fields | Responsibility |
|---|---|---|
| RequirementSource | storyId, acIds | product docs から抽出した要求側 truth |
| TestReferenceSource | storyId, filePath, testType, testName? | test file metadata から抽出した artifact |
| GeneratedStoryMapping | storyId, storyMappings | schema 互換の matrix fragment |
| MatrixGenerationReport | unknownStories, missingTests, orphanTests, preservedReferences | 生成時の説明可能性 |

## Merge Policy

- generated matrix は `version`, `generatedAt`, `stories` を持つ。
- 既存 matrix にある test reference は、同一 `storyId` / `acId` の generated reference と重複しない限り保持する。
- schema が許す `testName` は保持する。schema 非互換の任意 metadata は matrix に書かず、report で説明する。
- product docs に存在しない story への test metadata は `orphanTests` として report する。
- AC はあるが test reference がない場合は `missingTests` として report する。
