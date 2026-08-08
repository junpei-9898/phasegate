---
id: WI-052
type: story
severity: normal
status: reflected
legacy_id: H02-05
---

# WI-aware story reflection listing

@story-id H02-05
設計要素: ISSUE-026 Phase C-1 として、story reflection の列挙対象を旧 story directory から WI layout へ拡張する。

- **対応ストーリー**: H02-05
- **対応 Issue**: ISSUE-026 (Phase C-1)
- **Unit**: phase-dependency-model
- **作成日**: 2026-04-24

## 背景

Phase B で `docs/inception/issues/*` は `docs/inception/_cross/WI-*` に移行された。既存の `FileSystemStoryReflectionAdapter#listStoryDirectories()` は `docs/inception/{unit}/` 直下だけを列挙するため、`_cross/WI-*` が reflection check の候補に入らない。

## 受け入れ基準

- [ ] AC-1: `docs/inception/{unit}/WI-*` が story reflection 候補として列挙される
- [ ] AC-2: legacy `docs/inception/{unit}/{HXX-XX}` / `US-*` は移行期間中も列挙される
- [ ] AC-3: `docs/inception/_cross/WI-*` が story reflection 候補として列挙される
- [ ] AC-4: `docs/inception/{unit}/issues` は列挙されない
- [ ] AC-5: `docs/inception/_cross` の非WIディレクトリは列挙されない
