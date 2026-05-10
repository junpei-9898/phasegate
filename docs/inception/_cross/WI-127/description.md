---
id: WI-127
type: fix
severity: normal
status: drafted
affects: [documentation, ci-governance]
source: internal
---

# WI-127: README feature inventory must match the shipped PhaseGate surface

> 起票日: 2026-05-09
> 起票経緯: README review で、README が `28 AIDLC skills` と記載している一方、現物の `skills/*/SKILL.md` は 30 件あり、feature inventory と実装実態がずれていることを確認した。

## 背景

README は package 利用者が最初に読む feature contract である。skill 数、known limitations、roadmap、CLI surface の説明が実装とずれると、ユーザーが存在しない挙動を期待したり、逆に利用可能な機能を見落としたりする。

今回確認した差分は、主に skill count と known limitations の表現である。これは機能追加ではなく、README / guide / generated docs を実装実態に同期する documentation fix である。

## 本 WI でやること

1. README / README.ja の skill count と skill overview の件数を実体に合わせる。
2. known limitations が完了済み WI を残スコープとして参照しないように更新する。
3. README の主要 CLI 表と `phasegate --help` の差分を確認し、説明の粒度を揃える。
4. docs/guide 側に同じ古い表現があれば同期する。

## 受け入れ基準

- [ ] README / README.ja の skill count が `skills/*/SKILL.md` の実数と一致する。
- [ ] known limitations が WI-033 の残スコープを直接参照せず、後続 WI を参照する。
- [ ] README の CLI 主要コマンド表と `phasegate --help` の差分が説明可能である。
- [ ] docs-only change として `git diff --check` が通る。

## 関連

- WI-033: doc-freshness / pointer-validation を L4 validator に昇格
- WI-128: L4 operational rollout must be completed after validator registration
