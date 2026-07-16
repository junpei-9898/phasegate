# World Model 導入計画

<!-- @work-item-id WI-280 -->

## 0. 背景とビジョン

phasegate を「コード書き込み時に設計と照合する一方向のゲート」から、「プロジェクトの世界（Unit / ドメインモデル / 論理設計 / Story / AC / テスト / ADR）を整合性制約群として表現し、どのノードの変更でも破れた制約を義務（obligation）として決定的に列挙する環境」へ対称化する。既存バリデータの出力方向を「ブロック」から「義務の列挙」へ反転させることで、ゲートは同時にプランナーになる。

思想上の不変条件:

1. **認知はAI層、真実は機械層** — ハーネスは義務を決定的に列挙するだけで「何をすべきか」を判断しない。対応の構想・実行はスキル（AI）層が担い、着地は既存ゲートで再検証される。
2. **意味的伝播を機械で主張しない** — 機械が生成するエッジは ID・明示参照・構造依存・content digest のみ。意味レベルの波及推定は AI 提案として明示的に格下げ表示する。
3. **波は即時ブロックにしない** — 波及した義務は可視化された負債として扱う。fail-closed は新規の主張のみ（ungated-legacy / adoption baseline パターン）。
4. **散文は構造化しない** — 散文はハッシュで pin される前提として扱う。構造化するのは既に構造を持つ影のみ。
5. **L3-007 の一般化** — 「主張は前提を pin し、再生成＋解決チェックで陳腐化を検出する」パターンを、テスト証憑からあらゆる前提へ拡張する。

本計画は Claude（オーケストレーター）の初期ドラフトに対し、GPT-5.6 sol（Codex CLI）がリポジトリ実コードを根拠とした敵対的レビュー（第1ラウンド: 責務境界・canonical 化・台帳信頼モデル・E2E 正解データの4点の破綻指摘）を行い、裁定合意の上で第2ラウンドで収束させた共同成果物である。レビューで撤回された主要案: 可変 obligation 台帳（→ immutable derived report + 分離 waiver）、既知ギャップ5件の「再発見」E2E（→ synthetic fixture mutation + 明示 debt import）、全 validator の warning-only 段階導入（→ 新規主張は初日から fail-closed）、schema 先行確定（→ ownership/identity/canonicalization の ADR 先行）。

## 1. 確定前提

- World は型付き有向の機械的事実であり、対称性は「制約のどちらの端点が変わっても再評価する」ことで実現する。
- 機械が生成する関係は ID、明示参照、構造依存、content digest に限定する。`refines` は明示 ID 参照がある場合だけ生成する。
- canonical product corpus と proposal である inception corpus は同一ノードとして混ぜない。
- obligation report は毎回再導出する immutable output とし、返済状態を保存しない。
- adoption baseline は既存 `phasegate` baseline と分離し、既知の `violationFingerprint` だけを非 blocking 化する。
- waiver は obligation report と分離し、constraint fingerprint、理由、期限、WI を必須にする。
- 新規 claim、新規 pin、壊れた constraint 宣言は導入初日から fail-closed。既存違反だけを adoption baseline により可視負債化する。
- L3 は保存済み report を信頼せず、clean checkout の corpus と constraint 宣言から独立再導出する。

## 2. 実行規約

下表の `WM-XX` は本計画内の安定 ID であり、Phasegate の正式 WI ID ではない。各項目を開始するときに未使用の `WI-XXX` を採番し、`docs/inception/_cross/{WI-XXX}/` を作成する。番号だけを先に予約して空の WI を作らない。

各実装 WI は次の順序で進める。

1. Phase 1: `_cross/{WI-XXX}/description.md`, `domain_model.md`, `logical_design.md`, `unit_test_design.md` と、Infrastructure/CLI を含む場合は `it_test_design.md` を作成する。
2. 人間承認を得る。
3. Phase 2 設計反映: affects に含めた各 Unit の `docs/product/construction/{unit}/` を `@work-item-id WI-XXX` 付きで累積更新する。
4. Phase 2 TDD: RED → GREEN → REFACTOR の順に実装する。
5. targeted test、該当 layer validator、統合チェックポイントを通す。

新 Unit `world-model` の source を初めて変更する前に、WM-05 で以下が存在し承認済みでなければならない。

- `docs/product/units/world-model_unit.md`
- `docs/product/construction/world-model/domain_model.md`
- `docs/product/construction/world-model/logical_design.md`
- `docs/product/construction/world-model/unit_test_design.md`
- `docs/product/construction/world-model/it_test_design.md`

## 3. フェーズと WI 分割

### Phase 0: 意思決定と Unit 設計

| ID | 目的 | 主な成果物 | 依存 | 並列 | 見積 |
|---|---|---|---|---|---|
| WM-01 | World の ownership、Unit 間依存、product/inception lifecycle を決定する | `_cross/{WI}/description.md`, `logical_design.md`; `docs/ADR/031-world-model-ownership-and-corpus-lifecycle.md` | なし | 起点。単独 | M |
| WM-02 | stable identity、fragment locator、rename/delete/duplicate の意味を決定する | `_cross/{WI}/{domain_model,logical_design}.md`; `docs/ADR/032-world-node-identity.md` | WM-01 | WM-03 の草稿と並列可、承認は先行 | M |
| WM-03 | canonicalization、snapshot roots、hashing capability の公開境界を決定する | `_cross/{WI}/{domain_model,logical_design,unit_test_design}.md`; `docs/ADR/033-world-snapshot-canonicalization.md` | WM-01、WM-02 の identity 契約 | WM-02 承認後は WM-04 草稿と並列可 | M |
| WM-04 | constraint、adoption baseline、waiver、L4-004 共存、CLI namespace を決定する | `docs/ADR/034-world-constraint-semantics.md`, `035-world-adoption-baseline-and-waiver.md`, `036-world-model-and-doc-freshness.md`, `037-world-cli-and-output-contract.md`; `_cross/{WI}/logical_design.md` | WM-02, WM-03 | ADR ファイルごとの草稿は並列可。最終承認は直列 | M |
| WM-05 | Product catalog に Epic/Story/Unit/統合契約を登録し、新 Unit の construction 設計を完成する | `docs/product/{product_overview,user_stories,user_story_mapping}.md`; `docs/product/units/{world-model_unit,integration_contract}.md`; `docs/product/construction/world-model/{domain_model,logical_design,unit_test_design,it_test_design}.md` | WM-01〜04 | 他 WI と並列不可。Phase 0 の単一統合点 | M |

### Phase A: Read-only World Snapshot

| ID | 目的 | 主な成果物 | 依存 | 並列 | 見積 |
|---|---|---|---|---|---|
| WM-06 | 既存 SHA-256 実装から Unit 非依存の hashing capability を抽出し、attestation と world-model が各自所有 port 越しに使えるようにする | attestation の public facade または ADR-033 で決めた共有公開面; `scripts/harness/attestation/{index.ts,composition-root.ts}` と対応 adapter/test; attestation product design 更新 | WM-03, WM-05 | WM-07 と並列可。attestation を触る他 WI とは不可 | M |
| WM-07 | World の domain primitives と canonical snapshot を実装する | `scripts/harness/world-model/domain/{entities,value-objects,services,ports}/**`; canonical serializer、Artifact/Fragment/Node/Edge/Snapshot、ExtractionDiagnostic; unit tests | WM-05、WM-03 | WM-06 と並列可。world-model composition-root は触らない | M |
| WM-08 | traceability-model から Unit/Story/AC/WorkItem/TestReference の plain DTO read API を公開する | traceability-model application facade/DTO/index; contract tests; `docs/product/construction/traceability-model/{domain_model,logical_design,unit_test_design,it_test_design}.md` | WM-02, WM-05 | WM-06, WM-07 と並列可 | M |
| WM-09 | product/inception/ADR/Unit 定義 extractor と extraction diagnostics を実装する | `scripts/harness/world-model/infrastructure/adapters/{product,proposal,adr,unit}-fact-*.ts`; fixture/unit/integration tests | WM-07, WM-08 | WM-10 と並列可。composition-root は触らない | M |
| WM-10 | source/test/matrix/attestation extractor を実装する | `scripts/harness/world-model/infrastructure/adapters/{source-metadata,test-reference,matrix,attestation}-fact-*.ts`; matrix/attestation fixture tests | WM-06, WM-07 | WM-09 と並列可。attestation source は変更しない | M |
| WM-11 | 全 extractor を graph/snapshot に組み立て、`world:inspect` を提供する | world-model application usecase、composition-root、presentation handler; `scripts/harness/main.ts`; `known-harness-commands.ts`; CLI conformance/E2E; harness-api/world-model product design 更新 | WM-08〜10 | 単独。CLI ホットスポット専有 | M |

WM-11 完了を「可視化マイルストーン」とする。これは corpus、重複 ID、未抽出、snapshot root を観測できるため内部価値はあるが、obligation を導出しないため World Model の機能 MVP とは呼ばない。

### Phase B: Constraint / Obligation MVP

| ID | 目的 | 主な成果物 | 依存 | 並列 | 見積 |
|---|---|---|---|---|---|
| WM-12 | 両端点 digest を持つ Constraint と構造 rule evaluator を実装する | `scripts/harness/world-model/domain/{entities/constraint.ts,services/constraint-evaluator.ts,value-objects/*}`; missing endpoint、digest mismatch、duplicate ID、broken ref、new claim rules; unit tests | WM-07, WM-04 | WM-09, WM-10 と並列可。composition-root は触らない | M |
| WM-13 | constraint declaration、adoption baseline、waiver の versioned schema と repository を実装する | `docs/contracts/world-*.schema.json`; `phasegate.world-constraints.json`; repository ports/adapters; baseline/waiver mapper tests | WM-12 | WM-11 後なら単独、または WM-09/10 と並列可 | M |
| WM-14 | obligation fingerprint、baseline comparison、immutable report 導出を実装する | application derive usecase; `reports/world-obligations.json` writer; report schema; deterministic sort/golden tests | WM-11〜13 | 単独。world-model application 統合点 | M |
| WM-15 | `world:pin` と `world:derive` を CLI に統合する | world-model handlers; `scripts/harness/main.ts`; `known-harness-commands.ts`; help/conformance/CLI tests | WM-14 | WM-11 と直列。CLI ホットスポット専有 | M |
| WM-16 | synthetic fixture mutation E2E を完成する | `scripts/harness/__tests__/fixtures/world-model/**`; E2E tests/golden for determinism、missing/deleted/renamed/duplicate/stale/new claim、clean/dirty `.harness` | WM-15 | WM-17 の debt manifest 準備と並列可 | M |
| WM-17 | self-repo adoption baseline と dogfood smoke を確立し、既知の意味的負債は明示 debt ID として import する | self-repo baseline/constraint declaration; dogfood test; 必要なら `phasegate.world-debts.json` schema と coverage report の明示 ID。2回実行 byte-identical、構造違反集合=baseline、増分ゼロを検証 | WM-16 | 単独。baseline は inventory 結果を固定するため最後 | M |

WM-17 完了を World Model の「機能 MVP」とする。CLI で snapshot を観測し、明示 constraint から obligation を決定的に導出し、legacy baseline と増分を区別できる。まだ L2/L3 ゲートには接続しない。

### Phase C: Enforcement / Existing Mechanism Integration

| ID | 目的 | 主な成果物 | 依存 | 並列 | 見積 |
|---|---|---|---|---|---|
| WM-18 | world-model の config surface と resolved config mapping を追加する | config v2/v3 schema、domain config、preset JSON、resolution、`validator-system-config-mapper.ts` または専用 mapper、config tests/docs | WM-17 | WM-21/22 の Phase 1 設計と並列可。config hotspot 専有 | M |
| WM-19 | L2 fast-path を追加し、新規/壊れた constraint 宣言だけを fail-closed にする | validator ID/definition、RunL2 wiring、adapter/service、composition-root、registry golden、validator-system docs/tests | WM-18 | 単独。validator hotspot 専有 | M |
| WM-20 | L3 authoritative re-derivation を追加する | RunL3 wiring、clean corpus adapter、independent derive、composition-root、registry golden、CI integration tests | WM-19 | WM-19 と直列。validator hotspot 専有 | M |
| WM-21 | session-start に open obligations の要約を表示する | agent-integration context DTO/usecase/presentation、world-model query adapter、size limit tests、agent-integration docs | WM-17, WM-18 | WM-19/20 と source 上は並列可。ただし product docs reflection は別 commit にする | M |
| WM-22 | 設計変更イベントを既存 metadata/reflection/commit-msg 経路へ統合する | `scripts/harness/integrations/pre-commit.ts` の commit-msg path、traceability reflection adapter、changed fragment declaration tests、agent-integration/traceability/validator design 更新 | WM-18, WM-19 | WM-21 と source は分離可能だが agent-integration product docs が競合するため直列推奨 | M |
| WM-23 | attestation v2 に `worldSnapshotRoot` を入力として追加する | attestation v2 DTO/mapper/entity/usecases/schema/docs/tests。fragment digest は保存しない | WM-20, WM-06 | WM-21/22 と並列可。attestation hotspot 専有 | M |
| WM-24 | CI/template と regression suite に最終 E2E/dogfood を組み込む | `.github/workflows/ci.yml`; CI templates; regression-suite contract tests; guide/CLI docs; package dry-run verification | WM-20〜23 | 最終統合のため単独 | M |

WM-20 完了を「enforceable MVP」、WM-24 完了を production-ready line とする。

## 4. 並列 worktree の衝突分析

### 4.1 安全に並列化できる組

以下は、契約が承認済みで各 WI が composition root と共通 registry を変更しない条件で並列化できる。

| Wave | 並列可能な WI | 分離根拠 |
|---|---|---|
| A1 | WM-06 / WM-07 / WM-08 | attestation、world-model domain、traceability-model の別 Unit |
| A2 | WM-09 / WM-10 / WM-12 | world-model 内でも extractor ごとの新規ファイルと domain evaluator に分離。`composition-root.ts` と `index.ts` は変更禁止 |
| B1 | WM-13 / WM-11 の Phase 1 CLI 設計 | schema/repository と CLI 設計のみ。実装統合は直列 |
| B2 | WM-16 / WM-17 の明示 debt ID inventory | fixture と既存 corpus 調査。baseline ファイル生成は WM-16 着地後 |
| C1 | WM-21 / WM-23 | agent-integration と attestation の別 Unit。world-model public query/snapshot contract は固定済み |

### 4.2 直列化必須のホットスポット

| ホットスポット | 触る WI | 順序 |
|---|---|---|
| `scripts/harness/world-model/composition-root.ts` | WM-11, WM-14, WM-15 | WM-11 → WM-14 → WM-15 |
| `scripts/harness/main.ts` dispatch/help | WM-11, WM-15, WM-24 | WM-11 → WM-15 → WM-24 |
| `scripts/harness/harness-api/domain/value-objects/known-harness-commands.ts` と conformance test | WM-11, WM-15 | WM-11 → WM-15 |
| config v2/v3 schema、preset、resolved mapping | WM-18 | WM-18 が排他的に所有。WM-19/20 は resolved DTO を消費するだけ |
| `validator-system/domain/value-objects/validator-id.ts`、`validator-system/composition-root.ts`、L0 registry golden | WM-19, WM-20 | WM-19 → WM-20 |
| `config-foundation/application/mappers/validator-system-config-mapper.ts` | WM-18。必要な force-enable policy が validator 固有なら WM-19 | WM-18 → WM-19。同時編集禁止 |
| `scripts/harness/integrations/pre-commit.ts` / `.husky/commit-msg` | WM-22 | WM-22 が排他的に所有 |
| attestation DTO/schema/composition-root | WM-06, WM-23 | WM-06 → WM-23 |
| `.github/workflows/ci.yml` と配布 template | WM-24 | 最終 WI が排他的に所有 |
| `docs/product/product_overview.md`, `user_stories.md`, `user_story_mapping.md`, `units/integration_contract.md` | WM-05 | Phase 0 の単一統合 commit |

### 4.3 同一 Unit 内並列化のルール

- 並列 WI は `composition-root.ts`, `index.ts`, public registry を変更しない。新規 adapter/service と直接テストだけを作る。
- integration 担当 WI が各レーン着地後に composition root を一括配線する。
- 同じ product construction ファイルへの `@work-item-id` 追記は merge conflict が起きやすいため、設計反映 commit は Unit ごとに所有者を一人にする。
- schema と mapper を別 worktree に分けない。`additionalProperties: false` のため片方だけの着地は常に壊れた中間状態になる。
- main dispatch、known command list、help、conformance test は1 WIの1 commitで更新する。

## 5. 統合チェックポイント

### CP-0: Phase 0 完了（WM-01〜05）

- metadata validator が全 inception/product/ADR 文書を受理する。
- `pnpm harness:check-ready` で world-model の product construction 前提が満たされる。
- world-model、traceability-model、validator-system、attestation の import/export 所有関係を architecture review する。
- source 変更はまだ行わない。

### CP-1: Snapshot contract 完了（WM-06〜10）

- 各 Unit の targeted unit/integration tests。
- 同一 fixture を2回 snapshot 化し、canonical JSON と `corpusRoot` が一致する。
- filesystem 列挙順、object key 順、絶対 root path、LF/CRLF の規定済み差異に依存しない。
- parse failure、duplicate ID、unsupported corpus が silent omission にならず `ExtractionDiagnostic` に出る。
- `pnpm test`。

### CP-2: 可視化マイルストーン（WM-11）

- `world:inspect --json` の CLI E2E と golden。
- main dispatch と `KNOWN_HARNESS_COMMANDS` の集合一致。
- `pnpm test`。
- matrix 再生成後に L2/L3:
  - `pnpm exec tsx scripts/harness/main.ts phasegate:generate-matrix`
  - `pnpm exec tsx scripts/harness/main.ts validate --layer L2`
  - `pnpm exec tsx scripts/harness/main.ts validate --layer L3`
- `pnpm exec tsx scripts/harness/main.ts integrity:verify`。

### CP-3: 機能 MVP（WM-12〜17）

- synthetic fixture mutation E2E 全件:
  - missing endpoint
  - endpoint content drift
  - deleted/renamed fragment
  - duplicate ID
  - stale matrix reference
  - malformed/new constraint
  - new unpinned claim
  - waiver expiry
- 同一 checkout で `world:derive --json` を2回実行し byte-identical。
- clean checkout と既存 `.harness` を持つ checkout の結果一致。
- obligation report を手編集しても再導出結果と CI 判定が変わらない。
- self-repo の構造違反 fingerprint 集合が adoption baseline と厳密一致し、増分ゼロ。
- 既知の意味的負債は明示 debt ID の import 集合として一致し、「再発見」とは表現しない。
- full suite、L2、L3、integrity verify。

### CP-4: Enforceable MVP（WM-18〜20）

- L2 は legacy baseline 違反を表示するが blocking しない。
- L2 は malformed/new pin/new claim を fail-closed にする。
- L3 は保存 report を削除・改竄しても clean corpus から同じ blocking 結果を再導出する。
- fixture の base branch は PASS、各 mutation branch は期待 `ruleId` と fingerprint で FAIL。
- config v2/v3、minimal/standard/strict preset、resolved config mapper の全契約テスト。
- validator registry golden、full suite、L2、L3、integrity verify。

### CP-5: Production ready（WM-21〜24）

- session-start 表示は件数上限と省略表示が決定的で、report 全文をプロンプトへ注入しない。
- commit-msg 経路で design change declaration と WI reflection を検証する。
- attestation v2 が `worldSnapshotRoot` を pin し、fragment hash を重複保持しない。
- attestation v1 の backward compatibility と v2 の produce/verify E2E。
- CI の順序が test → matrix generation → world derive/L3 → attestation/integrity verify になる。
- self-repo dogfood smoke が CI で2回一致し、baseline 増分ゼロ。
- `pnpm test`、L2、L3、integrity verify、`pnpm pack --dry-run`。

## 6. MVP 切断線

| 切断線 | 完了 WI | 提供価値 | 判定 |
|---|---|---|---|
| 可視化マイルストーン | WM-11 | corpus inventory、安定 node ID、抽出診断、snapshot root、`world:inspect` | 内部価値あり。ただし obligation がないため機能 MVP ではない |
| 機能 MVP | WM-17 | 明示 constraint、両端点 drift、immutable obligations、baseline/waiver、fixture E2E、self-repo deterministic smoke | 最小で World Model の約束を満たす推奨切断線 |
| Enforceable MVP | WM-20 | L2 fast-path と L3 authoritative re-derivation | CI 防御として提供する最小線 |
| Production ready | WM-24 | session/commit-msg/attestation/CI/template/regression 統合 | 一般配布可能線 |

## 7. Phase 0 ADR リスト

### ADR-031: World Model の ownership と corpus lifecycle

- world-model は traceability-model の ID/WorkItem/Story モデルを複製せず、plain DTO/public facade から観測する。
- validator-system は gate 実行と blocking policy を所有し、world-model は事実の組立と制約評価を所有する。
- attestation は gate-run evidence、integrity は instruction corpus、matrix は Story/AC/TestReference index を所有する。
- product は canonical、inception は proposal/delta とし、同一 artifact として deduplicate しない。
- generated artifact、source、design document、external declaration の境界を決める。
- import の許可方向と anti-corruption adapter の配置を決める。

### ADR-032: World node identity と fragment locator

- Artifact、Fragment、WorkItem、SourceFile、TestReference、ExplicitClaim、Constraint、Snapshot の ID 形式。
- file identity と fragment identity の分離。
- 明示 fragment ID の記法と、legacy whole-file fallback。
- heading text/order を identity に使うか否か。
- rename、move、delete、duplicate ID、alias の扱い。
- proposal node と canonical node を接続する reflection relation。

### ADR-033: Canonical snapshot、version roots、hashing

- `corpusRoot`, `constraintRoot`, `evaluationId` の入力と除外項目。
- canonical JSON の recursive key sort、array order、path normalization。
- raw bytes、UTF-8、LF/CRLF、Unicode normalization、symlink、case sensitivity。
- `generatedAt`、absolute path、obligation report、version stamp 自身を除外する。
- extractorVersion、rulesetVersion、schemaVersion、relevant config digest の含め方。
- SHA-256 provider の公開境界。world-model は consumer-owned port を持ち、attestation 内部 port/VO を直接 import しない。

### ADR-034: Constraint semantics と対称再評価

- typed directed fact と endpoint-symmetric evaluation の区別。
- claimant/premise 双方の node ID と content digest を持つ constraint record。
- 機械 rule の限定: existence、ID uniqueness、explicit reference、declared dependency、digest equality。
- `refines` は明示 ID 宣言だけを事実化し、意味推論しない。
- deletion、rename、missing endpoint、malformed declaration の rule ID。
- change provenance は因果でなく baseline/current snapshot と changed candidates として表現する。

### ADR-035: Adoption baseline、obligation、waiver

- obligation report は immutable derived output。
- `repaid` は現行 evaluation から導出し、保存 state にしない。
- `violationFingerprint` の構成と ruleset migration。
- legacy baseline と新規 claim の blockingPolicy。
- waiver の必須項目、expiry、renewal、WI traceability。
- semantic debt declaration/import と structural obligation を別種として表示する。

### ADR-036: World constraints と L4-004 doc freshness の共存

- L4-004 の時間/更新鮮度と、World Model の explicit hash/reference drift の責務差。
- 重複検出時の canonical rule owner。
- L4-004 を維持、縮退、移行する条件と compatibility period。
- self-repo で L4 が disabled でも product capability として維持するか。

### ADR-037: `world:*` CLI と output/persistence contract

- `world:inspect`, `world:pin`, `world:derive` の top-level command 名。
- human/JSON output、exit codes、stdout/stderr。
- report の既定出力先と Git tracking 方針。
- constraints、baseline、waiver、explicit debt declaration のファイル名。
- `world:derive` の pure/read-only mode と report write mode。
- config 無指定時の corpus root、resolved config の利用、unknown schema fail-closed。

## 8. Hashing 再利用の裁定

既存実装の再利用には賛成するが、attestation の `ContentHasherPort` / `SourceDigesterPort` を world-model が直接 import する案には反対する。

- `ContentHasherPort` は attestation の domain invariant と attestation-local `Digest` VO を返す契約である。
- `SourceDigesterPort` はファイル全体を raw bytes で hash する application I/O port であり、fragment/canonical JSON の hash には適合しない。
- world-model は自 Unit が所有する consumer-side hashing port を定義する。
- ADR-033 で決めた public capability が既存 `NodeCryptoContentHasherAdapter` の SHA-256 primitive を実行し、world-model と attestation は結果をそれぞれの local Digest VO へ変換する。
- `node:crypto` を呼ぶ SHA-256 実装は増やさない。既存 adapter の移動または public facade 化で対応する。
- attestation infrastructure class や attestation-local Digest を world-model から直接 import しない。

## 9. 実行運用ノート（オーケストレーション）

### 9.0 実行体制の確定事項（2026-07-16）

- **スコープ**: 本ラウンドは WM-17（機能 MVP）まで。Phase C（WM-18〜24）は MVP 検収後に別途判断する。
- **実行主体**: Codex CLI（gpt-5.6-sol）が単独で実装を担当する。実行は依存順の直列（WM-01 → … → WM-17）とし、§4 の並列 wave は使用しない（単一実行者のため衝突しない。ホットスポット表は commit 分割の指針として引き続き有効）。
- **承認権限**: §2 の「人間承認」はオーケストレーター（Claude）が代行する。承認ポイントは①ADR-031〜037 の各ドラフト（WM-01〜04）と WM-05 の unit 設計一式は**個別承認**、②Phase A/B の実装 WI は**チェックポイント（CP-1 / CP-2 / CP-3）単位の一括検収**。承認が下りるまで次工程へ進まない。
- **リリース**: commit ごとの minor bump + タグはリポジトリ規約どおり実行者が行う。npm publish はユーザーがチェックポイント通過時のみ手動実行する（実行者は publish しない）。

本リポジトリで実証済みの実行プロトコルを本計画にも適用する。

- 並列 WI はオーケストレーターが **現行 main 基点で事前作成した worktree** を割り当てる（Agent tool の isolation:worktree は origin/main 基点のため、ローカル先行コミット中は stale になる）。
- エージェントは割り当てられた worktree 内でのみ作業し、main checkout への操作・ブランチ作成・`git symbolic-ref` / `git config` 書き込みを行わない（deny-check.sh により hook レベルでも拒否される）。
- 着地はオーケストレーターが `git restore --source=<branch> --worktree -- <files>` で main に取り込み、main 上で targeted test → full suite → L2/L3 → integrity verify を再実行してから commit する。
- 各着地 commit は package.json の minor version bump + `vX.Y.0` タグを伴う（リポジトリ規約）。
- §4.2 のホットスポット表は worktree 割り当て時の排他制御表として使う。同一ホットスポットを触る WI を同時に走らせない。
- 各 wave の完了時に該当チェックポイント（§5）を main 上で実行し、合格するまで次 wave を開始しない。

## 10. 未決事項

- 明示 fragment ID の具体的な Markdown 記法。
- legacy whole-file node から fragment node への migration 方法。
- raw prose fragment hash に Unicode normalization を適用するか、UTF-8 bytes をそのまま使うか。
- hashing capability の最終所有先。attestation public facade とするか、最小の shared public contract へ抽出するか。
- `phasegate.world-constraints.json`, `phasegate.world-baseline.json`, `phasegate.world-waivers.json`, `phasegate.world-debts.json` の正式名称。
- obligation report を既定で `reports/` に出すか `.harness/` に出すか。
- world-model の config key と validator ID。
- self-repo inventory 後の initial structural violation fingerprint 数。
- explicit semantic debt ID の記法と、既存 coverage report への埋め込み方式。
- attestation v2 の schemaVersion/predicateType と v1 coexistence period。
- session-start に表示する最大件数・文字数。
