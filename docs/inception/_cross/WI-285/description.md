---
id: WI-285
type: story
severity: high
status: drafted
affects: [world-model, adr-foundation, agent-integration, biome-ast-engine, ci-governance, config-foundation, harness-api, harness-error, nyquist-validation, phase-dependency-model, phase2-extensions, quick-mode, regression-suite, skill-quality, traceability-model, validator-system]
source: internal
---

# WI-285: World Model product foundation と Unit corpus canonical 化

<!-- @work-item-id WI-285 -->

## 背景

ADR-031 は Unit 定義の canonical filename を `<kebab-case Unit ID>_unit.md` とし、WM-06 の snapshot 実装前に重複 corpus を解消すると決定した。ADR-031 の実 inventory では、13 Unit に hyphen / underscore variant が併存し、さらに adr-foundation と regression-suite の2定義が Unit ID と一致しない filename を使用していた。

WM-05 は Phase 0 の単一統合点として、この物理 canonical 化を完了した後、World Model の product catalog と Unit 設計一式を確立する。

## WM-05 全体スコープ

### Step A: Unit 定義 corpus の物理 canonical 化

- 13重複ペアの全固有内容と traceability annotation を canonical 定義へ lossless に統合する。
- repository 内の旧 filename 参照を canonical path へ更新する。
- 13個の non-canonical variant を削除する。
- adr-foundation と regression-suite を Unit ID と一致する canonical filename へ移行する。
- metadata、phase readiness、Unit definition reader の回帰を検証する。

### Step B: World Model product foundation

- `docs/product/product_overview.md`、`user_stories.md`、`user_story_mapping.md` へ World Model を反映する。
- `docs/product/units/world-model_unit.md` と `docs/product/units/integration_contract.md` を作成または更新する。
- `docs/product/construction/world-model/` に domain、logical、unit test、integration test の設計を確立する。

Step B は Step A の承認後に実施し、World Modelのcatalog、Unit境界、Construction設計をproduct正本へ反映する。

## Step A inventory と統合記録

2026-07-16 に `docs/product/units/*_unit.md` を列挙し、ADR-031 の13重複ペアと2 rename target が存在することを再確認した。各 canonical 定義への統合内容は次のとおり。

| Unit ID | canonical filename | canonical 側へ保持・移動した固有内容 |
|---|---|---|
| agent-integration | `agent-integration_unit.md` | 詳細定義全文と、2026-04-05 の self-hosting path 導入履歴 |
| biome-ast-engine | `biome-ast-engine_unit.md` | 詳細定義全文、H03-08 annotation、2026-04-25 の path 導入履歴 |
| ci-governance | `ci-governance_unit.md` | 詳細定義全文、H13-01 annotation、2026-05-12 の path 導入履歴 |
| config-foundation | `config-foundation_unit.md` | canonical 側の configurable phase gate 拡張を維持し、legacy variant 固有の WI-219 `modelRouting.delegation` contract を統合 |
| harness-api | `harness-api_unit.md` | canonical 側の frontmatter / installation dispatch を維持し、legacy variant 固有の H09-01 annotation を統合 |
| harness-error | `harness-error_unit.md` | 詳細定義全文、WI-156 annotation、2026-05-13 の path 導入履歴 |
| nyquist-validation | `nyquist-validation_unit.md` | 詳細定義全文、H07-01 annotation、2026-05-12 の path 導入履歴 |
| phase-dependency-model | `phase-dependency-model_unit.md` | canonical 側の A-2設計と、legacy variant 固有の Level 3成果物、Phase 2拒否、`Artifact.required` の基礎制約を統合 |
| phase2-extensions | `phase2-extensions_unit.md` | 詳細定義全文、HF2-01 / HF2-04 annotation、WI-035 の path 導入履歴 |
| quick-mode | `quick-mode_unit.md` | 詳細定義全文、WI-159 / H10-02 annotation、2026-05-13 の path 導入履歴 |
| skill-quality | `skill-quality_unit.md` | 詳細定義全文、H03-08 annotation、2026-04-25 の path 導入履歴 |
| traceability-model | `traceability-model_unit.md` | canonical 側の frontmatterを維持し、legacy variant 固有の H03-01 annotation を統合 |
| validator-system | `validator-system_unit.md` | 詳細定義を維持し、legacy variant にだけ存在した WI-168 annotation を概要へ統合 |
| adr-foundation | `adr-foundation_unit.md` | 内容を変更せず canonical filename へ移行し、WI-285 の corpus 履歴を追記 |
| regression-suite | `regression-suite_unit.md` | 内容を変更せず canonical filename へ移行し、WI-285 の corpus 履歴を追記 |

alias の参照文や「将来統一」の注記は統合後の事実と矛盾するため、運用契約としては保持せず、導入日と self-hosting 上の目的を各 canonical 文書の Corpus 履歴へ保存した。

## 参照更新範囲

- ADR-031 と WI-281 の inventory / lifecycle record
- product construction の前提文書、coverage report、traceability test design / logic
- inception の logical design plan、test coverage plan、cross-WI reference
- shared implementation plan、documentation coverage / backlog
- Unit definition placeholder と CHANGELOG の歴史参照

scripts、skills、templates には旧 filename の実参照が存在しなかった。scripts/harness の source は変更していない。

## Step A 受け入れ基準

- 具体 Unit 定義が一 Unit 一ファイルになり、basename が `<Unit ID>_unit.md` と一致する。
- 13個の non-canonical variant と2個の rename 元が存在しない。
- 旧 filename の repository 内参照が0件である。
- canonical 定義に旧 variant の固有要件と traceability annotation が保持される。
- L2 metadata validation が7/7 PASSする。
- phase readiness が編集前と同じ pass を返す。
- Unit definition reader を通る targeted test がPASSする。

## Step B 受け入れ基準

- ADR-031〜037 の決定が product catalog と world-model Unit 定義へ反映される。
- world-model の domain / logical / unit test / integration test design が作成される。
- product / inception corpus role、ID、snapshot、constraint、baseline / waiver、CLI contract が相互矛盾なく接続される。
- Step B の独立承認まで実装には着手しない。

## Step B 設計反映記録

<!-- @work-item-id WI-285 -->

- product overviewへWorld Modelをfederated read modelとして追加した。
- Epic H17とH17-01〜H17-12を追加し、delivery planのWM-06〜17へ1対1でbindingした。
- `world-model_unit.md`とintegration contractにownership、consumer-owned adapter、provider plain DTO、public evaluation facade、CLI / persistence境界を反映した。
- `docs/product/construction/world-model/`へdomain / logical / unit test / integration test designを作成した。
- domain設計はADR-032〜035の`pgw:v1` identity、canonical roots、WCR-001〜008、baseline / waiver / obligationを正本とする。
- logical設計はClean Architecture 4層、consumer-owned ports、BuildSnapshot / InspectWorld / EvaluateConstraints / DeriveObligations / PinConstraints、top-level composition方針を定義した。
- unit test設計はWI-283の`UT-WM283-*`全caseを包含し、日本語case名、AAA、domain層mock禁止を固定した。
- integration test設計はextractor / owner facade / declaration repository / CLI / determinism / mutation fixtureの実装予定contractを定義した。

## Step B 検証結果

- catalog: H17 Story 12件、全Story heading 87件、重複ID 0件。H17-01〜12とWM-06〜17の対応をproduct catalog、mapping、Unit定義で一致させた。
- WI-283 carry-over: 元のunit test designとproduct unit test designの`UT-WM283-*`集合を比較し、欠落・追加0件。
- L2: `node --import tsx scripts/harness/main.ts validate --layer L2`が7/7 PASS。既存のskill-quality ungated-legacy coverage warningのみで失敗0件。
- readiness: `node --import tsx scripts/harness/main.ts phasegate:check-ready`が`status: pass`、評価対象88件すべてpass、H17の12件すべてmissing phaseなし。88件はstructured Story heading 87件に、既存のmetadata-only `@story-id H13-05` 1件を加えたharness上の集合である。
- hygiene: `git diff --check`がPASSし、scripts/harness source、protected principles、package lockに変更なし。

## Step A 検証結果

- Unit corpus: concrete Unit 16件、重複 Unit ID 0件、basename / Unit ID mismatch 0件。`{unit}_unit.md` は concrete definition ではない template として別扱い。
- 旧 filename: repository-wide `rg` で参照0件、13 non-canonical variantと2 rename元の実在0件。
- lossless audit: 詳細定義を移した8 Unitとrename 2 Unitは、移行元の全行が canonical 側に同順で残ることを diff で確認した。残る5 Unitは両詳細定義の差分を個別確認し、config-foundation WI-219、harness-api H09-01、traceability-model H03-01、validator-system WI-168と、phase-dependency-model の基礎制約を統合した。
- L2: `node --import tsx scripts/harness/main.ts validate --layer L2` が7/7 PASS。既存の skill-quality ungated-legacy coverage warningのみで失敗0件。
- readiness: `node --import tsx scripts/harness/main.ts phasegate:check-ready` が編集前後とも `status: pass`、exit 0。
- targeted test: traceability-model custom paths testが1/1 PASS。
- real corpus smoke: `MarkdownUnitDefinitionGateway` が16 Unit、duplicate 0を返した。
- diff hygiene: tracked changeに対する `git diff --check` がPASSした。

## 依存と後続

- ADR-031〜037 を前提とする。
- Step A の承認後にのみ Step B を開始する。
- WM-06 の snapshot implementation は WM-05 完了後に開始する。
