---
adr_id: "031"
title: "World Model の ownership と corpus lifecycle"
status: Proposed
date: 2026-07-16
---

# World Model の ownership と corpus lifecycle

<!-- @work-item-id WI-281 -->

## Context

World Model は Unit、WorkItem、Story、AC、test、ADR、source、design document、generated evidence を型付き事実として観測し、明示制約を評価する。しかし既存の traceability-model、validator-system、attestation、nyquist-validation、ci-governance は既にそれぞれの domain model と lifecycle を所有している。world-model がそれらを複製すると、同じ ID や policy に複数の正本が生じる。

また、canonical design である `docs/product/` と proposal / delta である `docs/inception/` は同一 WI や同一内容を持ち得る。content digest だけで統合すると、確定設計と提案の provenance を失う。

`docs/product/units/` の実 inventory では、具体 Unit 定義29ファイルが論理 Unit 16個を表し、hyphen / underscore の重複が13ペア存在した。全ペアは内容が byte-identical ではなく、alias と full definition、または異なる時点の full definition が併存している。World snapshot がこの corpus を無条件に読むと、一つの Unit を複数 artifact として観測するか、一方の固有情報を失う。

本 ADR は World node identity、hash canonicalization、constraint semantics、CLI contract より先に、ownership、import、corpus role と Unit 定義の lifecycle を決める。

## Decision

### 1. World Model は federated read model とする

world-model は他 Unit の上位正本ではない。各 owner が公開する plain DTO / public read facade を consumer-owned anti-corruption adapter で World-local fact へ変換し、事実を組み立てる。

- traceability-model は ID、Unit、WorkItem、Story の model / parsing / status lifecycle を所有する。
- world-model は traceability-model の `StoryId`、WorkItem Entity、frontmatter model を複製せず、plain DTO から観測する。
- world-model は artifact / fact / edge / extraction diagnostic と constraint evaluation を所有する。
- provider の domain object は World の public / internal contractへ漏らさない。

### 2. Gate と evaluation の ownership を分離する

- validator-system は validator registry、layer execution、severity、exit code、blocking policy を所有する。
- world-model は corpus からの事実組立と、宣言された構造制約の評価を所有する。
- world-model は `blocking: true` のような gate policy を決めず、violation / diagnostic を plain evaluation DTO として返す。
- validator-system infrastructure の adapter が evaluation DTO を validation result へ変換し、validator-system の policy を適用する。
- world-model から validator-system への import は禁止する。

### 3. Evidence / integrity / matrix の owner を維持する

- attestation は gate-run evidence、produce / verify、record schema と evidence lifecycle を所有する。
- ci-governance の integrity capability は instruction corpus、integrity manifest、pin / verify lifecycle を所有する。
- nyquist-validation の matrix capability は Story / AC / TestReference index、matrix schema、generation と coverage semantics を所有する。
- traceability-model が Story identity を所有し、matrix はその ID を参照する index を所有する。matrix と world-model は Story identity を再定義しない。
- world-model は各 public plain DTO または versioned projection を観測するだけで、attestation / integrity / matrix の schema を自 Unit の schema として複製しない。

### 4. Product と inception を別 corpus role とする

- `docs/product/**` は canonical design corpus とする。
- `docs/inception/**` は proposal / delta corpus とする。
- 同じ明示 ID、path fragment、heading、content digest を持っても同一 artifact として deduplicate しない。
- inception から product への反映は `@work-item-id` による明示 relation で接続する。
- product 反映後の inception は provenance として残り得るが、canonical product の代替にはならない。
- archive と fragment identity の詳細は ADR-032 で決める。本 ADR は corpus role の非同一性を固定する。

### 5. Artifact kind を lifecycle で分類する

World ingestion は artifact を次の4種類に分ける。

1. **design document** — product、inception、ADR。人がレビューする設計意図であり、product / inception の corpus role を保持する。
2. **source** — 実装 source と test source。test source と matrix の TestReference index は別 artifact である。
3. **generated artifact** — matrix projection、attestation record、snapshot、obligation report。producer から再生成可能な projection / evidence / report であり、保存物だけを一次正本として信頼しない。
4. **external declaration** — integrity manifest と将来の World constraint / adoption baseline / waiver / explicit debt declaration。生成コマンドで下書きできても、人が review して採用した後は versioned control input として扱う。

種類が異なる artifact は content digest が同じでも統合しない。関係が必要なら明示 reference または `derived-from` 相当の fact で接続する。

### 6. Import と anti-corruption adapter の方向を固定する

compile-time import は次を許可する。

- `world-model/infrastructure -> traceability-model public facade / plain DTO`
- `world-model/infrastructure -> nyquist-validation public matrix facade / plain DTO`
- `world-model/infrastructure -> attestation public evidence facade / plain DTO`
- `world-model/infrastructure -> ci-governance integrity public facade / plain DTO`
- `validator-system/infrastructure -> world-model public evaluation facade / plain DTO`
- `harness-api / top-level composition -> 各 Unit の public handler / DTO`

anti-corruption adapter は provider ではなく consumer に置く。world-model の domain / application は consumer-owned port のみに依存し、他 Unit の domain / infrastructure / composition-root を import しない。provider に public read facade がなければ provider Unit で追加し、deep import で代替しない。

attestation v2 へ `worldSnapshotRoot` を渡す将来統合は top-level composition が primitive / input DTO を注入する。attestation から world-model を import させず、循環依存を作らない。

### 7. Unit 定義の canonical filename を kebab Unit ID に統一する

canonical filename は `<kebab-case Unit ID>_unit.md` とする。Unit ID、source / construction directory、phase dependency の `{unit}_unit.md` 解決を同じ文字列へ揃える。

inventory で確認した全13ペアと canonical は次のとおり。

| canonical | non-canonical |
|---|---|
| `agent-integration_unit.md` | `agent_integration_unit.md` |
| `biome-ast-engine_unit.md` | `biome_ast_engine_unit.md` |
| `ci-governance_unit.md` | `ci_governance_unit.md` |
| `config-foundation_unit.md` | `config_foundation_unit.md` |
| `harness-api_unit.md` | `harness_api_unit.md` |
| `harness-error_unit.md` | `harness_error_unit.md` |
| `nyquist-validation_unit.md` | `nyquist_validation_unit.md` |
| `phase-dependency-model_unit.md` | `phase_dependency_model_unit.md` |
| `phase2-extensions_unit.md` | `phase2_extensions_unit.md` |
| `quick-mode_unit.md` | `quick_mode_unit.md` |
| `skill-quality_unit.md` | `skill_quality_unit.md` |
| `traceability-model_unit.md` | `traceability_model_unit.md` |
| `validator-system_unit.md` | `validator_system_unit.md` |

non-canonical 側は恒久 alias にしない。WM-05 に割り当てる正式 WI が固有内容と traceability annotation を canonical 側へ lossless に統合し、repository 内参照を更新した後、同じ WI 内で削除する。WM-05 の正式 WI ID は開始時に採番し、WM-06 の snapshot 実装開始前に移行を完了する。

重複相手がない `adr_foundation_unit.md` と `regression_suite_unit.md` も同じ WM-05 WI で `adr-foundation_unit.md` と `regression-suite_unit.md` へ移行する。`installation_unit.md` は規則に適合する。WI-281 では削除・移動を行わない。

### 8. Initial structural violation fingerprint は ruleset 固定後に実測する

現時点の numeric estimate は採用しない。node identity、ruleset、fingerprint 形式が未決定であり、13重複ペアをそのまま fingerprint 数へ換算すると事実でない精度を作るためである。

WM-17 で、WM-05 canonical 化後の clean checkout、承認済み `schemaVersion` / `extractorVersion` / `rulesetVersion` / relevant config を入力に全構造 rule を実行する。`violationFingerprint` で一意化し、総数と `ruleId` / corpus kind / Unit 別内訳を決定的順序で記録する。同一 checkout で2回実行して fingerprint 集合と serialized bytes が一致した集合だけを initial structural violation baseline とする。

ExtractionDiagnostic、explicit semantic debt、waiver は structural violation 数に混ぜない。ruleset version が変われば version ごとに再計数し、旧総数と単純比較しない。

### 9. ADR-031 外の未決事項を先取りしない

fragment ID / legacy whole-file migration は ADR-032、Unicode / hashing capability / snapshot root は ADR-033、constraint fingerprint / semantic debt / waiver は ADR-034〜035、declaration filename / report path / CLI / config は ADR-037、attestation v2 と session-start 表示は各後続 WI で決める。

## Consequences

### Positive

- ID、Story、WorkItem、gate policy、evidence、matrix に二つ目の正本を作らずに World を構築できる。
- consumer-owned adapter が provider schema の変化を局所化し、domain 間の循環依存を防ぐ。
- product と inception の provenance を失わず、proposal を canonical truth と誤認しない。
- Unit corpus が一 Unit 一 canonical artifact へ収束し、snapshot の重複入力を事前に除去できる。
- initial baseline の件数を再現可能な ruleset と結び付けられる。

### Negative / Trade-off

- provider ごとに public read facade / plain DTO の追加が必要になる。
- WM-05 では13ペアの内容差分と repository 内参照を lossless に統合する作業が発生する。
- inception と product を別 artifact とするため node 数は増える。
- fingerprint の初期件数は WM-17 まで確定しない。

## Alternatives

- **world-model に Story / WorkItem model を複製する** — ownership が分裂し、traceability-model の parsing / lifecycle 変更と drift するため不採用。
- **validator-system に constraint evaluation も置く** — gate policy と corpus facts が結合し、read-only inspection や endpoint-symmetric evaluation を再利用しにくいため不採用。
- **product / inception を ID または digest で統合する** — canonical と proposal の provenance を失うため不採用。
- **underscore 側を canonical とする** — Unit ID、source / construction directory、`{unit}_unit.md` placeholder の kebab-case と一致しないため不採用。
- **hyphen alias を恒久保持する** — extractor ごとの alias 解釈を必要にし、一 Unit 一 artifact の invariant を壊すため不採用。

## 関連要件・文書

- `docs/inception/_cross/WI-280/delivery_plan.md` §1, §3 WM-01, §7 ADR-031, §10
- `docs/inception/_cross/WI-281/description.md`
- `docs/inception/_cross/WI-281/logical_design.md`
- `docs/folder_management_rules.md`
- ADR-005（ヘキサゴナルアーキテクチャ）
- ADR-027（成果物駆動状態導出）
- ADR-030（gate-run evidence、instruction integrity、L3 再導出）
