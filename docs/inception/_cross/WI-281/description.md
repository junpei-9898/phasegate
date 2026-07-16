---
id: WI-281
type: story
severity: high
status: drafted
affects: [world-model, traceability-model, validator-system, attestation, nyquist-validation, ci-governance, phase-dependency-model]
source: internal
---

# WI-281: World Model ownership と corpus lifecycle の確立

<!-- @work-item-id WI-281 -->

## 背景

World Model は product / inception / ADR / source / test / matrix / attestation / integrity declaration を横断して事実を観測する。一方、既存 Unit が所有する ID や検証モデルを world-model 内に複製すると、二つの正本と循環依存を作る。また `docs/product/units/` には同一 Unit ID を表す hyphen / underscore ファイルが併存しており、snapshot 導入前に canonical corpus と移行責任を決める必要がある。

本 WI は `docs/inception/_cross/WI-280/delivery_plan.md` の WM-01 を実行し、World の ownership、Unit 間の許可依存、anti-corruption adapter の配置、product / inception lifecycle、Unit 定義 corpus の canonical 化方針を決定する。

## スコープ

- world-model と traceability-model / validator-system / attestation / matrix / integrity の ownership 境界
- Unit 間 import の許可方向と public facade / plain DTO 契約
- product を canonical、inception を proposal / delta とする lifecycle
- generated artifact / source / design document / external declaration の分類
- `docs/product/units/` の全重複ペア inventory と canonical filename
- non-canonical Unit 定義の移行時期と所有 WI
- self-repo initial structural violation fingerprint の計数方針

## スコープ外

- World node / fragment の stable identity と Markdown 記法（WM-02 / ADR-032）
- canonical serialization、hashing、snapshot root（WM-03 / ADR-033）
- constraint、adoption baseline、waiver の詳細意味論（WM-04 / ADR-034〜035）
- CLI、出力先、config key、validator ID（WM-04 / ADR-037）
- product 反映、Unit 定義の削除・移動、source / test の変更（WM-05 以降）

## 受け入れ基準

- ADR-031 が ownership と import 境界を一意に定めている。
- product と inception は同一内容でも別 artifact として観測され、content digest による deduplicate を行わない。
- Unit 定義 corpus の13重複ペアが全て列挙され、各ペアの canonical と non-canonical lifecycle が決まっている。
- generated artifact / source / design document / external declaration の境界が定義されている。
- self-repo initial structural violation fingerprint は推測値で固定せず、versioned ruleset に対する再現可能な計数手順が定義されている。
- 本 WI の承認時点では文書以外を変更せず、Unit 定義ファイルの削除・移動を行わない。

## 成果物

- `docs/inception/_cross/WI-281/description.md`
- `docs/inception/_cross/WI-281/logical_design.md`
- `docs/ADR/031-world-model-ownership-and-corpus-lifecycle.md`

## 依存と後続

- 先行依存はない。
- 本 WI と ADR-031 の承認後に WM-02 を開始できる。
- Unit 定義 corpus の物理 canonical 化は WM-05 に割り当てる正式 WI が行い、WM-06 の snapshot 実装開始前に完了させる。
