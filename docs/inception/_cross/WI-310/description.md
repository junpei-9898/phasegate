---
id: WI-310
type: fix
severity: high
status: reflected
affects: [harness-api]
source: internal
---

# WI-310: Hermetic large-stdout CLI regression

<!-- @work-item-id WI-310 -->

## 背景

WI-308の`validate --layer L2 --json`回帰テストは、self-repoのuntracked `.harness/requirement-test-matrix.json`から604件のWorld warningが導出されることを前提にしていた。GitHub Actionsのtest stepはmatrix生成より前に実行されるため、出力は約1.8 KiBとなり、64 KiB超assertionが環境依存で失敗した。

## 修正

- tracked fixture configをtemp workspaceへ展開し、`world.enabled:true`を固定する。
- uniqueな明示fragment IDごとに2文書を生成し、duplicate no-winner / WCR-005を決定的に160件導出する。
- self-repoのmatrix、baseline、coverage、現在のadopted-legacy件数を入力にしない。
- `--format json`と`--json`の両経路で64 KiB超、完全JSON、L2-017実行、exit 1を検証する。

## 受け入れ基準

- `.harness/requirement-test-matrix.json`が存在しないclean CI順序でも両caseがPASSする。
- fixture由来のstdoutは64 KiBを超え、単一JSON documentとしてparseできる。
- productionのWorld baselineやwarning件数を変更しない。

