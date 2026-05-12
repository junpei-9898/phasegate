---
id: WI-128
type: issue
severity: normal
status: reflected
affects: [validator-system, phase2-extensions, ci-governance, documentation]
source: internal
---

# WI-128: L4 operational rollout must be completed after validator registration

> 起票日: 2026-05-09
> 起票経緯: WI-033 は L4-004 / L4-005 の登録と実行配線が完了済みだが、README に残っていた scheduling / default / operational docs の残スコープを独立 WI として切り出す。

## 背景

WI-033 は `doc-freshness` と `pointer-validation` を L4 validator に昇格する WI として完了済みである。現在の残課題は validator registration そのものではなく、L4 をプロジェクト運用にどう組み込むかである。

具体的には、weekly scheduled audit の template、default-off から opt-in する判断基準、L4 warning/advisory policy、`p2:*` compatibility command との関係、README / guide の運用手順を揃える必要がある。

## 本 WI でやること

1. L4 scheduled audit の推奨 workflow と `ci:generate-template --type consistency-check` の関係を整理する。
2. `layers.L4.enabled: false` default と strict preset / opt-in 運用の判断基準を docs に明記する。
3. L4 warning / fail-on-warning / disabled skip の運用 policy を README / guide / CLI output で一貫させる。
4. `p2:check-freshness` / `p2:validate-pointers` は compatibility command であり、正規 L4 実行は `validate --layer L4` であることを明確化する。
5. registry package dogfood で generated consistency-check workflow または同等の local dry-run を確認する。

## 受け入れ基準

- [ ] WI-033 は validator registration 完了済みとして閉じたまま維持される。
- [ ] README / README.ja の known limitations が WI-128 を L4 運用残スコープとして参照する。
- [ ] L4 scheduled audit の推奨 command / cron / preset policy が guide にある。
- [ ] `validate --layer all` / `phasegate:ci-check` / `validate --layer L4` の L4 enabled/disabled 挙動が docs と一致する。
- [ ] `p2:*` compatibility command の位置付けが docs に明記されている。

## 関連

- WI-033: doc-freshness / pointer-validation を L4 validator に昇格
- WI-107: CI/L4 execution semantics must be unified
- WI-108: `phasegate:ci-check` must match its documented L2-L4 contract
- WI-116: README roadmap must be reconciled with implemented L4-004/L4-005 validators
