# 論理設計: H12-07 — Work-Item trailer support

@story-id H12-07
設計要素: commit message に `Work-Item` trailer を付与する契約。

## 1. 対象

対象は `CommitMessage` 値オブジェクトである。AtomicCommitService / GitCommitExecutorAdapter は `commitMessage.format()` に依存しているため、trailer整形はVOに閉じ込める。

## 2. 仕様

- `CommitMessage.create(unit, storyId, description, workItemId?)` を提供する。
- `workItemId` 未指定時は既存の `feat({unit}/{storyId}): {description}` を返す。
- `workItemId` 指定時は空行を挟んで `Work-Item: WI-XXX` を付与する。
- `workItemId` が `WI-\d+` に一致しない場合は `SkillQualityError('INVALID_WORK_ITEM_ID')` を投げる。

## 3. 後方互換

既存呼び出しは3引数のまま動作する。`equals()` は `workItemId` も比較対象に含める。
