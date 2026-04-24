---
id: H12-07
unit: skill-quality
type: story
issue: ISSUE-026
phase: D-2
created: 2026-04-24
---

# H12-07: Work-Item trailer support

## 背景

ISSUE-026 Phase Dでは、Quick Modeを含む軽量パスでも `Work-Item: WI-XXX` で変更証跡を残す。skill-quality の Atomic Commit 経路が生成するコミットメッセージも、WI trailerを表現できる必要がある。

## 要求

- `CommitMessage` が任意の `workItemId` を保持できる。
- `workItemId` は `WI-\d+` のみ受け付ける。
- `format()` は `Work-Item: WI-XXX` trailerを出力する。
- `workItemId` 未指定の既存コミット形式は維持する。
