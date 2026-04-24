# 論理設計: H11-06 — WI cross layout write target scope

@story-id H11-06
設計要素: `_cross/WI-*` の write target scope を Level 3 として解決する。

## 1. 対象

対象は `agent-integration` Unit の `WriteTargetScope` 値オブジェクトである。Hook の入力パスをフェーズゲート用スコープへ変換する責務は既存通り `WriteTargetScope.fromPath()` に集約する。

## 2. パス判定ルール

`docs.inception` 配下の判定に以下を追加する。

| パターン | 結果 |
|---|---|
| `{inception}/_cross/WI-XXX/...` | `level=3`, `unitId="_cross"`, `storyId="WI-XXX"` |
| `{inception}/_cross/{non-wi}/...` | `level=1` |
| `{inception}/issues/ISSUE-XXX/...` | 既存互換として `level=1` |
| `{inception}/{unit}/WI-XXX/...` | 既存の work item ID パターンで `level=3`, `unitId`, `storyId` |

`WriteTargetScope` は現在 `level=3` で `unitId` 必須の不変条件を持つ。横断 WI は実Unitに属さないため、Phase C-2では `_cross` を仮想 unitId として保持する。frontmatter の `type` / `affects` に基づく実Unit解決は後続 Phase C-3 の責務とする。

## 3. 後方互換

旧 `docs/inception/issues/ISSUE-*` は横断 issue として Level 1 に留める。これは Phase B の物理移行後も、履歴や未移行ブランチで同パスが現れた場合に既存挙動を壊さないためである。

## 4. テスト方針

- `_cross/WI-026/description.md` が Level 3 として解決されること。
- カスタム `docs.inception` でも同じ判定になること。
- `_cross/memo.md` など非WIは Level 1 で止まり、storyId を持たないこと。
- 既存の `issues` パス互換テストを維持すること。
