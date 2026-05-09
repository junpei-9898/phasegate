---
id: WI-116
type: issue
severity: trivial
status: implemented
affects: [documentation, validator-system]
source: internal
---

# WI-116: README roadmap must be reconciled with implemented L4-004/L4-005 validators

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、README roadmap が `doc-freshness` / `pointer-validation` を未実装予定として扱う一方、`list-errors --layer L4` と product docs では L4-004 / L4-005 が登録済みであることを確認した。

## 背景

README / README.ja.md の roadmap は public-facing な状態説明である。実装済みの validator を「今後の実装予定」として残すと、利用者は PhaseGate の現状を誤解する。

これは機能追加ではなく、公開ドキュメントと実装状態の不一致である。

## 本 WI でやること

1. README / README.ja.md の WI-033 roadmap 記述を現状に合わせて修正する。
2. `docs/guide/layer-model.md` と `docs/guide/cli-reference.md` の L4-004 / L4-005 表現を確認する。
3. 実装済みなら roadmap から除外し、必要に応じて release note / completed note に移す。
4. 未完了部分が残る場合は、実装済み範囲と残スコープを分けて書く。

## 受け入れ基準

- [x] README / README.ja.md が L4-004 / L4-005 を未実装予定として扱わない
- [x] `list-errors --layer L4` の登録状態と public docs が一致する
- [x] WI-033 の残スコープがある場合、未完了部分だけが roadmap に残る
- [x] 日本語 README と英語 README の説明が同じ状態を表す

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
