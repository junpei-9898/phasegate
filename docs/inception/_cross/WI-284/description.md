---
id: WI-284
type: story
severity: high
status: drafted
affects: [world-model, validator-system, phase2-extensions, harness-api, config-foundation, ci-governance]
source: internal
---

# WI-284: World constraint、baseline、waiver、CLI contract の確立

<!-- @work-item-id WI-284 -->

## 背景

World Model が snapshot の差から再現可能な obligation を導出するには、関係の方向と再評価の対称性、constraint endpoint の pin、構造 rule の限界を先に固定する必要がある。さらに、既存違反を可視 debt として導入する adoption baseline、一時例外である waiver、既存 L4-004 doc freshness との責務差、CLI / persistence contract を一貫した境界で決めなければならない。

現行実装には、`GateGraph` の明示 `dependsOn` と graph validation、L4-001 / semantic drift の集合差分、validator-system の `Lx-NNN` ID、ci-governance の path / SHA-1 baseline が存在する。これらは有用な実装上の先例だが、World constraint、World adoption baseline、World rule ID の正本ではない。本 WI は既存 owner を維持しながら、ADR-034〜037 で World 固有 contract を決定する。

## スコープ

- typed directed fact と endpoint-symmetric constraint evaluation
- claimant / premise の node ID と content digest を固定する constraint record
- existence、ID uniqueness、explicit reference、declared dependency、digest equality に限定した構造 rule
- deletion、rename continuity、missing endpoint、malformed declaration の識別
- baseline / current snapshot に基づく非因果的 change provenance
- immutable obligation、adoption baseline、waiver、explicit semantic debt の境界
- World constraint と L4-004 doc freshness の責務分離と共存
- `world:*` CLI、config、declaration、output / persistence contract

## スコープ外

- World node ID、fragment marker、alias、reflection identity（ADR-032で確定済み）
- canonical JSON、content normalization、three roots、hashing capability（ADR-033で確定済み）
- `violationFingerprint`、baseline、waiverの詳細決定（ADR-035）
- L4-004との移行条件の詳細決定（ADR-036）
- CLI command、file name、config key、layer validator IDの詳細決定（ADR-037）
- schema、repository、evaluator、CLI、validator wiringの実装（WM-12以降）

## 受け入れ基準

- directed factの意味方向と、両endpoint変更時に同じconstraintを再評価することが区別されている。
- constraint recordがclaimant / premise双方のstable node IDとpinned content digestを持つ。
- v1の機械評価が構造的な5 categoryを越えて意味推論しない。
- `refines`が明示されたstable ID間だけに生成される。
- malformed、missing、deletion、explicit rename continuityを安定したrule IDで区別できる。
- change provenanceがbaseline / current snapshotとchanged candidatesだけを記録し、変更原因や暗黙renameを主張しない。
- adoption baseline、waiver、L4-004、CLIの後続ADR境界がlogical designに示されている。
- World内部rule ID、ADR-032 diagnostic code、validator-system layer IDが混同されない。

## 成果物

- `docs/inception/_cross/WI-284/description.md`
- `docs/inception/_cross/WI-284/logical_design.md`
- `docs/ADR/034-world-constraint-semantics.md`
- `docs/ADR/035-world-adoption-baseline-and-waiver.md`
- `docs/ADR/036-world-model-and-doc-freshness.md`
- `docs/ADR/037-world-cli-and-output-contract.md`

ADR-034〜037は1本ずつ草稿・承認・着地する。本着地点ではADR-034だけを作成し、ADR-035〜037は未着手とする。

## 依存と後続

- ADR-031のownership、artifact kind、product / inception corpus roleを前提とする。
- ADR-032の`pgw:v1` ID、DeclaredKey、no-winner duplicate、single-hop aliasを前提とする。
- ADR-033のleaf digest、`corpusRoot` / `constraintRoot` / `evaluationId`分離を前提とする。
- ADR-034承認後、ADR-035がobligation / baseline / waiver、ADR-036がL4-004共存、ADR-037がCLI / persistence / validator registrationを決定する。
- 実装はWM-12〜16、self-repo adoptionはWM-17、gate統合はWM-18〜20が担当する。
