# 論理設計: H02-05 WI-aware story reflection listing

@story-id H02-05
設計要素: `FileSystemStoryReflectionAdapter#listStoryDirectories` の列挙対象を WI layout へ拡張する。

- **対応ストーリー**: H02-05
- **対応 Issue**: ISSUE-026 (Phase C-1)
- **Unit**: phase-dependency-model
- **作成日**: 2026-04-24

## 1. 設計方針

既存の domain port 名 `listStoryDirectories(unitId)` は互換維持のため変更しない。ただし返すIDは storyId に限定せず、移行期間中の work item ID を含む「reflection対象ID」とする。

## 2. 列挙ルール

- Unit-owned: `docs/inception/{unit}/{id}` のうち `_` / `.` で始まらず、`issues` ではないディレクトリを列挙する
- Cross-unit: `docs/inception/_cross/WI-*` のディレクトリを列挙する
- 重複IDは1件に正規化し、ソートして返す

## 3. 非対象

- `affects` による cross WI の対象Unit絞り込み
- `_cross` 用の product mapping 解決
- `WriteTargetScope` の `_cross/WI-*` Level 3 化

上記は Phase C-2 / C-3 で扱う。
