# H03-06: WorkItem 物理レイアウト移行 dry-run（ISSUE-026 Phase B-1）

@story-id H03-06
概要: ISSUE-026 Phase B の最初の安全ステップとして、既存 `docs/inception/issues/*` と `docs/inception/{unit}/issues/*` を WI レイアウトへ移行するための dry-run 計画を生成する。

- **Epic**: H-03 Traceability Model
- **上位 Issue**: ISSUE-026
- **先行 US**: H03-05（WI frontmatter の L2 metadata validator 統合）
- **スコープ**: Phase B-1 の dry-run / 計画出力のみ
- **優先度**: Must
- **着手日**: 2026-04-24

## 背景

ISSUE-026 Phase B は、work item の物理レイアウトを以下へ統一する:

- Unit 所有: `docs/inception/{unit}/{WI-XXX}/`
- 横断: `docs/inception/_cross/{WI-XXX}/`

ただし既存の issue ディレクトリを即時移動すると、進行中作業・リンク・legacy grep 互換を壊すリスクがある。まず dry-run で移行計画を機械生成し、移動元・移動先・frontmatter 追記内容・衝突を確認可能にする。

## 本ストーリーで実施すること

1. 旧レイアウトを走査して migration candidate を列挙する
2. 旧 ID (`ISSUE-026` 等) から `WI-026` の移行先 ID を導出する
3. `description.md` / `issue_description.md` の frontmatter 追記計画を生成する
4. `--dry-run` 相当の出力で、移動元・移動先・legacy_id・衝突有無を確認できる
5. まだ実ファイルは移動しない

## 本ストーリーで実施しないこと

- 実ファイルの rename / move
- `docs/inception/issues/` の削除
- `WriteTargetScope.fromPath` の刷新
- `_cross` を gate 対象にする実装
- PR trailer / quick-implementor の WI-aware 化

## 関連文書

- [ISSUE-026](/Users/jumpei/dev/PhaseGate/docs/inception/issues/ISSUE-026/issue_description.md)
- [H03-05](/Users/jumpei/dev/PhaseGate/docs/inception/traceability-model/H03-05/description.md)
