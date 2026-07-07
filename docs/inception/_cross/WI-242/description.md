---
id: WI-242
type: chore
severity: normal
status: drafted
---

# WI-242: skills/ 監査で検出された dangling reference・フロー矛盾の修正（P1）

## Context

全30スキルの監査（4エージェント並列）で、スキル本文に検証済みの矛盾が見つかった。
本 WI はランタイム挙動に影響しないドキュメント修正のみを扱う（P1 バッチ）。
モデル名ハードコード（レンダラー結合あり）は P2、スキル統廃合は P3 として別 WI で扱う。

## Acceptance Criteria

- [ ] 「model-routing.md のレビュー観点 R1〜R7」参照を、実在する無番号「レビュー観点」節（5項目）への参照に修正（該当全スキル）
- [ ] test-coverage-checker の存在しないスキル参照（model-tdd-executor / it-tdd-executor）を story-implementor に修正
- [ ] skill-creator の存在しない references/workflows.md / references/output-patterns.md への参照を解消
- [ ] scaffold-wi の型引数の記載を実装（story|issue|fix|refactor|chore）に一致させる（story-writer / logical-designer）
- [ ] テスト設計フロー順序（designer 群 vs logic-designer/coverage-checker 群で逆転）を docs/guide/skills-overview.md を正として単一化
- [ ] AIDLC Step 採番の自己矛盾（unit-designer 1.2↔3, domain-designer 2.1↔4, logical-designer 2.2↔5）を正の採番系に統一
- [ ] environment-designer の位置づけ（並行 vs 後続）を skills-overview.md と一致させる
- [ ] 既存 green のテスト（skill-quality conformance 含む）が green のまま
- [ ] レンダラー置換対象文字列（"Sonnet 4.6…delegate-sonnet 経由"等）と正規見出し構造には触れない
