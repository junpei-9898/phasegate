# WI-281 Logical Design: World Model ownership と corpus lifecycle

<!-- @work-item-id WI-281 -->

## 1. 設計目的

World Model を既存 Unit の上位正本にせず、各 Unit が所有する事実を plain DTO と consumer-owned adapter で観測する read model として配置する。World Model 自身が所有するのは、観測済み事実の組立、World 固有型への変換、明示制約の評価である。

## 2. Ownership 境界

| 能力 / corpus | owner | world-model が観測するもの | world-model が所有しないもの |
|---|---|---|---|
| ID / Unit / WorkItem / Story | traceability-model | public read facade が返す plain DTO | `StoryId`、WorkItem frontmatter model、status derivation、parser |
| gate execution / blocking | validator-system | World evaluation の実行結果を gate 入力へ写像した結果 | layer orchestration、validator registry、severity、exit code、blocking policy |
| World facts / constraints | world-model | Artifact / node / edge / diagnostic / evaluation の World-local model | 他 Unit の domain object、gate policy |
| gate-run evidence | attestation | public evidence DTO、検証済み evidence metadata | attestation record、signature、granularity、produce / verify lifecycle |
| Story / AC / TestReference index | nyquist-validation の matrix capability | versioned matrix projection または public matrix DTO | matrix aggregate、schema、generation、coverage semantics |
| instruction corpus integrity | ci-governance の integrity capability | manifest の versioned plain DTO と検証状態 | pin / verify lifecycle、integrity target、manifest schema |
| command dispatch | harness-api / top-level composition | world-model の public handler / output DTO | command registry、stdout / stderr、exit code |

traceability-model が Story identity を所有し、matrix はその ID を参照する Story / AC / TestReference index を所有する。matrix が Story identity を再定義したり、world-model が両者を統合した第三の Story model を作ったりしない。

## 3. Artifact kind と lifecycle

World の ingestion 時に、全 artifact を次の provenance kind のいずれかとして扱う。拡張子ではなく lifecycle と authority で分類する。

| kind | 例 | authority / lifecycle |
|---|---|---|
| `design-document` | `docs/product/**`, `docs/inception/**`, `docs/ADR/**` | 設計意図を人がレビューする文書。product / ADR と inception は下記 corpus role でさらに分離する |
| `source` | `scripts/harness/**/*.ts` と test source | 実行可能な一次 source。test は source の role であり、TestReference index そのものではない |
| `generated-artifact` | requirement-test-matrix、attestation record、World snapshot / obligation report | producer から再生成される projection / evidence / report。保存物だけを一次正本として信頼しない |
| `external-declaration` | integrity manifest、将来の World constraint / baseline / waiver / explicit debt declaration | 人が review して採用する versioned control input。生成コマンドで下書きできても、採用後は再生成 output ではなく宣言として扱う |

異なる kind の artifact は、path、明示 ID、content digest が一致しても deduplicate しない。generated artifact が source や design document の内容を投影していても、`derived-from` 相当の明示関係で接続し、同一 artifact にはしない。

### 3.1 Product / inception

- `docs/product/**` は canonical corpus であり、確定設計の現在値を表す。
- `docs/inception/**` は proposal / delta corpus であり、検討中または実装時点の意図と provenance を表す。
- inception から product への反映は `@work-item-id` を持つ明示的な reflection として扱う。
- 同じ WI / Story / heading / content digest を持っても、product artifact と inception artifact を統合しない。
- inception は product 反映後も provenance として観測できるが、canonical product の代替にはならない。
- archive 方針や fragment identity は ADR-032 に委ねる。ADR-031 は corpus role の分離だけを固定する。

## 4. Import 許可方向

矢印は compile-time import の `consumer -> provider` を表す。

| consumer | 許可する provider | 許可 surface |
|---|---|---|
| world-model infrastructure | traceability-model | `index.ts` 等の public read facade と plain DTO のみ |
| world-model infrastructure | nyquist-validation | public matrix read facade / versioned plain DTO のみ |
| world-model infrastructure | attestation | public evidence read facade / plain DTO のみ |
| world-model infrastructure | ci-governance integrity | public integrity read facade / versioned plain DTO のみ |
| validator-system infrastructure | world-model | public evaluation facade / plain result DTO のみ |
| harness-api / top-level composition | 各 Unit | public handler / public DTO の組立だけ |

次を禁止する。

- world-model の domain / application から他 Unit の domain、infrastructure、composition-root を import すること
- world-model から validator-system を import すること
- validator-system の domain が world-model の domain object を import すること
- provider Unit の内部 Entity / Value Object / Port を world-model の public contract に露出すること
- 相互 import により cycle を作ること

attestation v2 が将来 `worldSnapshotRoot` を受け取る場合、top-level composition が primitive / input DTO として注入する。attestation から world-model を import させず、world-model が evidence 観測のため attestation public surface を参照する一方向を維持する。

## 5. Anti-corruption adapter

adapter は常に consumer 側へ置く。

```text
traceability public DTO ──> world-model/infrastructure adapter ──> World-local fact
matrix public DTO       ──> world-model/infrastructure adapter ──> World-local fact
attestation public DTO  ──> world-model/infrastructure adapter ──> World-local fact
integrity public DTO    ──> world-model/infrastructure adapter ──> World-local fact

World evaluation DTO ──> validator-system/infrastructure adapter ──> gate result
```

- world-model application は `TraceabilityFactSourcePort` 等の consumer-owned output port に依存する。
- world-model infrastructure adapter が provider DTO の version / optional field / naming difference を吸収し、World-local fact へ変換する。
- validator-system infrastructure adapter が World の violation / diagnostic を validator-system 所有の validation result へ変換し、blocking policy を適用する。
- provider に public read facade がない場合は provider Unit の後続 WI で追加し、deep import で代用しない。
- filesystem を直接読む extractor も world-model infrastructure に置く。ただし traceability-model や matrix が所有する ID / index の解析規則を再実装せず、public facade の DTO と project-relative path で join する。

## 6. Unit 定義 corpus inventory

### 6.1 調査方法と母集団

2026-07-16 の作業ツリーで `docs/product/units/*.md` を列挙し、具体 Unit 定義について basename の `-` を `_` に正規化して衝突を確認した。32 Markdown 中、`catalog_policy.md`、`integration_contract.md`、`{unit}_unit.md` template を除く具体 Unit 定義は29ファイル、論理 Unit は16個である。

- 重複: 13ペア（26ファイル）
- 重複なし: 3ファイル
- 13ペアは全て内容が byte-identical ではない。
- 現行 `MarkdownUnitDefinitionGateway` は全 `*_unit.md` を走査して本文の `Unit ID` を読むため、同じ Unit ID を持つ full definition の併存は重複観測になり得る。
- phase dependency の既定 path は `{unit}_unit.md` であり、Unit ID と source / construction directory は kebab-case である。

### 6.2 全重複ペアと決定

canonical filename は一律 `<kebab-case Unit ID>_unit.md` とする。

| Unit ID | canonical | WM-05 前の差分 | WM-05 の処置 |
|---|---|---|---|
| agent-integration | `agent-integration_unit.md` | canonical 側は詳細定義への alias | 詳細本文と path 導入履歴を canonical へ統合 |
| biome-ast-engine | `biome-ast-engine_unit.md` | canonical 側は Story annotation 付き alias | 詳細本文、H03-08、導入履歴を統合 |
| ci-governance | `ci-governance_unit.md` | canonical 側は Story annotation 付き alias | 詳細本文、H13-01、導入履歴を統合 |
| config-foundation | `config-foundation_unit.md` | 両側が詳細定義で、legacy variant に WI-219 が存在 | WI-219 の config contract を canonical へ統合 |
| harness-api | `harness-api_unit.md` | canonical 側に installation dispatch、legacy variant に H09-01 が存在 | 両方を canonical へ統合 |
| harness-error | `harness-error_unit.md` | canonical 側は WI-156 付き alias | 詳細本文と WI-156 を canonical へ統合 |
| nyquist-validation | `nyquist-validation_unit.md` | canonical 側は H07-01 付き alias | 詳細本文と H07-01 を canonical へ統合 |
| phase-dependency-model | `phase-dependency-model_unit.md` | canonical 側に A-2、legacy variant に基礎制約の詳細が存在 | 両方の固有要件と履歴を統合 |
| phase2-extensions | `phase2-extensions_unit.md` | canonical 側は HF2-04 付き alias | 詳細本文、HF2-01 / HF2-04、WI-035 履歴を統合 |
| quick-mode | `quick-mode_unit.md` | canonical 側は WI-159 / H10-02 付き alias | 詳細本文と両 annotation を統合 |
| skill-quality | `skill-quality_unit.md` | canonical 側は H03-08 付き alias | 詳細本文と H03-08 を統合 |
| traceability-model | `traceability-model_unit.md` | canonical 側に frontmatter、legacy variant に H03-01 が存在 | 両方を canonical へ統合 |
| validator-system | `validator-system_unit.md` | 両側が詳細定義で、legacy variant だけに WI-168 が存在 | WI-168 annotation を canonical へ統合 |

重複のない adr-foundation と regression-suite も filename と Unit ID の規則を合わせ、WM-05 で `adr-foundation_unit.md` と `regression-suite_unit.md` を canonical filename とする。`installation_unit.md` は現規則に適合する。

### 6.3 Lifecycle と移行ゲート

- WI-281 では canonical の決定だけを記録し、ファイルを削除・移動しない。
- 物理移行は WM-05 に割り当てる正式 WI が所有する。正式 WI ID は WM-05 開始時に未使用番号を採番する。
- WM-05 は canonical 側へ全固有内容と traceability annotation を lossless に統合し、repository 内参照を canonical path へ更新する。
- non-canonical 側は redirect / alias として残さず、WM-05 内で削除する。alias を World node として恒久保持しない。
- content diff、リンク、metadata validator、phase readiness を確認した後に削除し、WM-06 の snapshot 実装を開始する前に canonical 化を完了する。
- git history は rename / deletion history で保持し、本文二重化による互換性は維持しない。

## 7. Initial structural violation fingerprint の計数

現時点では node identity、ruleset、fingerprint 形式が ADR-032 / ADR-034 で未確定なため、数値を見積もりとして固定しない。13重複ペアは corpus debt の事実だが、1ペアが何 fingerprint になるかを先取りしない。

計数は WM-17 で次の順に行う。

1. WM-05 の Unit corpus canonical 化を完了する。
2. 承認済みの `schemaVersion` / `extractorVersion` / `rulesetVersion` と relevant config を固定する。
3. clean checkout から全 corpus を抽出し、構造 rule を評価する。
4. `violationFingerprint` で一意化し、`ruleId`、corpus kind、Unit ごとの内訳と総数を決定的順序で出す。
5. 同一 checkout で2回実行し、fingerprint 集合と serialized bytes の一致を確認する。
6. 集合を self-repo adoption baseline と厳密比較し、増分ゼロを確認する。

ExtractionDiagnostic、explicit semantic debt、waiver は structural violation 総数へ混ぜず、別集計にする。ruleset が変わった場合は旧数との単純比較をせず、version ごとに再計数する。

## 8. Failure boundary

- provider DTO の unknown schema / unsupported version は silent omission にせず `ExtractionDiagnostic` とする。
- 同じ Unit ID の複数 canonical candidate は duplicate corpus diagnostic とする。
- provider の read failure を validator-system の blocking policyへ直接変換しない。world-model は事実と診断を返し、validator-system が layer / policy に基づいて blocking を決める。
- generated report の保存状態を返済状態の正本にしない。評価時に corpus と declaration から再導出する。

## 9. 後続 WI への契約

- WM-02 は本書の artifact kind と product / inception 分離を前提に stable identity を決める。
- WM-03 は public DTO を World-local digest へ変換する hashing / canonicalization を決める。
- WM-04 は constraint / baseline / waiver / CLI の詳細を決める。
- WM-05 は Unit corpus の物理 canonical 化と product catalog / construction 反映を行う。
- WM-08 は traceability-model の plain DTO read facade を実装する。
- WM-09 / WM-10 は consumer-owned adapters を実装する。
