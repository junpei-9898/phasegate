---
id: WI-349
type: fix
severity: high
status: implemented
affects: [quick-mode, agent-integration]
source: GitHub issue #41 症状②（遮断理由から原因が読み取れない / session 有効なのに session begin を案内される）
---

# WI-349: Full Mode 遮断メッセージに判定根拠を明示する

<!-- @work-item-id WI-349 -->

## 背景

1. `QuickModeJudgmentEngine` の遮断理由は不許可ファイルのパス列挙のみで、
   「そのパスがどのカテゴリに分類され、どの変更種別と判定されたか」が読めなかった。
   利用者は原因をワークツリー上の無関係な変更に求めてしまい、原因究明が空転する。
2. hook のブロックメッセージは、アクティブな Full Mode session があってもその存在に触れず
   「phasegate session begin せよ」と案内していた。session は既に張ってあるのにそう言われる、
   という最悪の混乱を生んでいた（WI-348 の語彙不一致と重なると特に致命的）。

## 修正

1. MIXED_CHANGES / NEW_DOMAIN / API_CONTRACT の理由文字列に per-file の
   `(category=..., changeKind=...)` を含める。
2. ブロックメッセージに
   - 「判定対象は今回の書き込み対象パスのみ（ワークツリーの他の未コミット変更は無関係）」
   - session が active かつ不許可の場合はその session 情報と不許可理由、
     および張り直す場合の `session end` 手順
   を追加する。
