---
id: WI-102
type: story
severity: normal
status: drafted
legacy_id: H11-06
---

# H11-06: WI cross layout write target scope

## 背景

ISSUE-026 Phase B で `docs/inception/issues/ISSUE-*` は `docs/inception/_cross/WI-*` に移行された。PreToolUse Hook のフェーズゲート判定は `WriteTargetScope.fromPath()` を起点にしているため、旧 `issues` パスだけを認識している状態では、新しい横断 WI への書き込みが実装フェーズの対象として扱われない。

## 要求

- `docs/inception/_cross/WI-XXX/...` を Level 3 の作業単位として検出する。
- `storyId` には `WI-XXX` を保持する。
- 旧 `docs/inception/issues/ISSUE-XXX/...` は移行互換として Level 1 のまま維持する。
- `_cross` 配下の非 WI ディレクトリを作業単位として誤認しない。

## 完了条件

- `WriteTargetScope.fromPath()` の単体テストに `_cross/WI-*` のケースが追加される。
- デフォルト `docs/inception` とカスタム `ProjectPaths.docs.inception` の両方で動作する。
- 既存の US / ISSUE パス認識テストが green のまま維持される。
