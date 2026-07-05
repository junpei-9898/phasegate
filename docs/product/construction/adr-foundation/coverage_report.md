# テストカバレッジレポート: adr-foundation

@story-id H05-01
@story-id H05-02
@story-id H05-03
> 判定対象:
> - `docs/product/units/adr_foundation_unit.md`
> - `docs/product/construction/adr-foundation/domain_model.md`
> - `docs/product/construction/adr-foundation/logical_design.md`
> - `docs/product/construction/adr-foundation/unit_test_design.md`
> - `docs/product/construction/adr-foundation/it_test_design.md`
>
> 注記:
> - `adr_foundation_unit.md` には AC 固有IDがないため、本レポートの `AC ID` 列は元文書に存在するストーリーID（`H05-01`〜`H05-03`）をそのまま使用する
> - 本UnitのpresentationはCLIであり、HTTP APIエンドポイントは論理設計に定義されていないため、APIカバレッジは評価対象外とする

## 1. サマリー
| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 22 | 1 | 95.7% |
| ドメインロジック | 39 | 0 | 100.0% |
| UseCase | 6 | 2 | 75.0% |
| **総合** | **67** | **3** | **95.7%** |

> **訂正履歴（第2訂正・WI-231, v0.176.0）**: WI-229（下記）で「未カバー」へ反転させた 9 行（§12 Key Decision 8 決定行 + AC-3 status 写像行）は、その後の起票・整合作業により**現在は実態として真にカバー済み**となったため、正直に「カバー」へ差し戻した。根拠は誤った網羅主張の再来ではなく、以下の実在成果物である: (1) v0.175.0 で §12 の 11 決定を全て専用 ADR として起票（新規 ADR-022〜029 + 既存 ADR-007/008/010）、各 ADR は `## Context` 内に `> §12 Key Decision: <key>` マーカーを 1 行担持する; (2) `real-adr-corpus.it.test.ts` に AC-1 presence テスト（`§12 Key Decisions全11件が起票済みで各keyがdiscoverableかつschema-validなADRに解決する`）を追加し、11 canonical key 全件が実 `docs/ADR/` コーパスの marker に実在し、かつ各 key が discovery + schema-valid な ADR に解決することを fail-closed で検証する（in-code 配列ではなく実コーパスをアサート。marker 欠落時は欠落 key を名指しで失敗する）; (3) AC-3 の status 不一致は §12 #10（validator-stack-detection）を Decided へ確定し it_test_design IT-AF-094 と整合させたことで解消、実コーパスの全 ADR status ∈ {Accepted, Proposed} を status テストが検証する; (4) H05-02 の全 AC（AC-1..AC-4）に `@ac H05-02-N` の per-AC binding を付与し、L3-005 acBoundStories を `[HF2-05, H06-03, H05-02]` へ拡張して fileFallbackOnly===0 を fail-closed で強制する。残る唯一の受け入れ基準未カバーは H05-01 の `docs/ADR/template.md` 実体配置検証（別 Unit の H05-01 スコープ）のみ。サマリー値を再計算した（受け入れ基準 13→22 カバー / 10→1 未カバー、総合 58→67 カバー / 12→3 未カバー、82.9%→95.7%）。

> **訂正履歴（第1訂正・WI-229）**: 旧版は H05-02「§12 Key Decision」11 行を全て「カバー」と記載していたが、これは**誤った網羅主張**であった。引用テスト IT-AF-015 / IT-AF-090 / IT-AF-094 は `SeedInitialAdrsUseCase` の「初期11件ADR定義配列」（in-code のロジック）を fixture/mock/論理設計 §5.5 の仕様と照合するのみで、**実 `docs/ADR/` コーパスに当該 11 決定を記録した ADR が実在すること**を一切アサートしていなかった。当時のコーパスでは 11 件中 3 件のみが実 ADR として記録済みで残り 8 件は ADR 不在であったため、当該 8 行 + AC-3 status 写像行の計 9 行を「未カバー」へ訂正した（この債務は上記第2訂正で正規に返済済み）。

### 判定結果

H05-01 / H05-02 / H05-03 の受け入れ基準は概ね網羅済みである。**H05-02 AC-1（§12 Key Decisions の ADR 化）は達成済み**で、§12 の 11 決定は全て実 `docs/ADR/` に専用 ADR として起票され（ADR-022〜029 + ADR-007/008/010）、`real-adr-corpus.it.test.ts` の AC-1 presence テストが 11 key 全件の実在と schema-validity を fail-closed で検証する。AC-2/3/4 も同ファイルの conformance / status / discovery テストで per-AC binding 済みで、L3-005 acBoundStories に H05-02 を追加済み（fileFallbackOnly===0）。残る未カバーは、実装開始前に補完すべき UseCase 系 2 件（`CreateAdrTemplateUseCase` / `ChangeAdrStatusUseCase` の異常系）と、`docs/ADR/template.md` の実体配置保証（H05-01）の計 3 件である。

## 2. 受け入れ基準カバレッジ詳細
| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|---------------|----------|
| H05-01 | `docs/ADR/` に ADRテンプレートファイルを作成する | IT-AF-010, IT-AF-011, IT-AF-095, IT-AF-096（内容生成は検証しているが `docs/ADR/template.md` の実体配置は未検証） | 未カバー |
| H05-01 | テンプレート構造が Title / Status / Context / Decision / Result / Alternatives を持つ | IT-AF-010, IT-AF-011, IT-AF-012, IT-AF-081, IT-AF-082 | カバー |
| H05-01 | YAMLフロントマターに `title`, `status`, `date`, `adr_id` を含み機械可読である | IT-AF-011, IT-AF-069, IT-AF-074, IT-AF-076 | カバー |
| H05-01 | archgateパターンを機械可読な形式で定義できる | UT-AF-090〜111, IT-AF-070, IT-AF-075, IT-AF-076 | カバー |
| H05-01 | ADRテンプレートのフロントマターに `archgate` オプショナル項目を追加できる | UT-AF-070, UT-AF-075〜078, IT-AF-012 | カバー |
| H05-02 | ADR「パッケージ分離（Quality Harness / Orchestration）」を作成する | **ADR-022**（`022-package-separation.md`, status: Accepted, marker `> §12 Key Decision: package-separation`）が本決定を専用 ADR として記録済み。`real-adr-corpus.it.test.ts` の AC-1 presence テストが marker 実在と schema-validity を、conformance テストがテンプレート準拠を fail-closed で検証する | カバー |
| H05-02 | ADR「ESLint→Biome全面移行」を作成する | **ADR-023**（`023-eslint-to-biome-migration.md`, status: Accepted, marker `eslint-to-biome`）が本決定を専用 ADR として記録済み。AC-1 presence テストが marker 実在と schema-validity を fail-closed 検証 | カバー |
| H05-02 | ADR「K1-K13全て品質ハーネス側帰属」を作成する | **ADR-024**（`024-k-requirements-quality-ownership.md`, status: Accepted, marker `k-requirements-quality-ownership`）が本決定を専用 ADR として記録済み。AC-1 presence テストが検証 | カバー |
| H05-02 | ADR「FUSE Hooks Engineはv1スコープ外」を作成する | **ADR-025**（`025-fuse-hooks-engine-out-of-scope.md`, status: Accepted, marker `fuse-out-of-scope`）が本決定を専用 ADR として記録済み。AC-1 presence テストが marker 実在と schema-validity を fail-closed 検証 | カバー |
| H05-02 | ADR「HarnessErrorにfix_example必須化」を作成する | ADR-010（`010-harness-error-fix-example.md`, status: Accepted）が本決定を専用 ADR として記録済み。実コーパス conformance は `real-adr-corpus.it.test.ts` で fail-closed 検証される | カバー |
| H05-02 | ADR「Quick Mode適用条件の厳格定義」を作成する | ADR-008（`008-quick-mode.md`, status: Accepted）が本決定を専用 ADR として記録済み。実コーパス conformance は `real-adr-corpus.it.test.ts` で fail-closed 検証される | カバー |
| H05-02 | ADR「設定ファイル分離（phasegate.config.json / orchestration.config.json）」を作成する | **ADR-007**（`007-harness-config-single-source.md`, status: Accepted）が本決定を記録し、`> §12 Key Decision: config-file-separation` marker を担持する。AC-1 presence テストが marker 実在と schema-validity を fail-closed 検証 | カバー |
| H05-02 | ADR「Nyquist統合（GSD-2 Truths/Artifacts検証パターン）」を作成する | **ADR-026**（`026-nyquist-truths-artifacts-integration.md`, status: Accepted, marker `nyquist-truths-artifacts`）が本決定を専用 ADR として記録済み。AC-1 presence テストが検証 | カバー |
| H05-02 | ADR「成果物駆動の状態導出」を作成する | **ADR-027**（`027-artifact-driven-state-derivation.md`, status: Accepted, marker `artifact-driven-state`）が本決定を専用 ADR として記録済み。AC-1 presence テストが検証 | カバー |
| H05-02 | ADR「スタック検出（バリデータ無限ループ防止）」を作成する | **ADR-028**（`028-validator-stack-detection.md`, status: Accepted, marker `validator-stack-detection`）が本決定を専用 ADR として記録済み。§12 #10 は Decided へ確定（it_test_design IT-AF-094 と整合）。AC-1 presence テストが検証 | カバー |
| H05-02 | ADR「L0→4層一時定義→5層復帰パス」を作成する | **ADR-029**（`029-four-to-five-layer-return-path.md`, status: Accepted, marker `four-to-five-layer-path`）が本決定を専用 ADR として記録済み。AC-1 presence テストが検証 | カバー |
| H05-02 | 各ADRがH05-01テンプレート構造に準拠する | IT-AF-015, IT-AF-019, IT-AF-077〜083, IT-AF-085〜089 | カバー |
| H05-02 | §12でDecided済みのものは `Accepted`、検討中は `Proposed` である | `real-adr-corpus.it.test.ts` の status テスト（`発見された全ADRのstatusがAcceptedまたはProposedである`, `@ac H05-02-3`）が実コーパスの全 ADR status ∈ {Accepted, Proposed} を fail-closed 検証する。§12 #10（validator-stack-detection）の status 不一致は Decided へ確定し it_test_design IT-AF-094 と整合させたことで解消済み。11 決定 ADR は全て status=Accepted（§12 Decided → ADR Accepted 写像に準拠） | カバー |
| H05-02 | 各ADRのフロントマターが機械的に解析可能である | IT-AF-069〜076, IT-AF-077, IT-AF-083 | カバー |
| H05-03 | 全ADRのフロントマターで `status` を必須化する | UT-AF-128, IT-AF-030, IT-AF-034 | カバー |
| H05-03 | `status` が `Proposed / Accepted / Deprecated / Superseded` のいずれかであることを検証する | UT-AF-050〜055, IT-AF-008, IT-AF-098, IT-AF-106 | カバー |
| H05-03 | `Superseded` 状態のADRには `superseded_by` を含める | UT-AF-067, UT-AF-129, IT-AF-031 | カバー |
| H05-03 | フロントマターバリデーションの自動テストを持つ | IT-AF-029〜037, IT-AF-116〜121 | カバー |

## 3. ドメインロジックカバレッジ詳細

カウント根拠は、ADR集約の不変条件8件、値オブジェクト制約28件、`AdrValidationService` の検証ルール3件の合計39件。

### 集約
| 対象 | 不変条件・ルール | 対応テストケース | カバー状態 |
|------|----------------|---------------|----------|
| ADR | INV-1 `AdrId` は3桁数字で一意 | UT-AF-001, UT-AF-007, UT-AF-018 | カバー |
| ADR | INV-2 `AdrStatus` は4つの有効値のみ | UT-AF-001, UT-AF-009〜017, UT-AF-022〜025 | カバー |
| ADR | INV-3 `Superseded` の場合は `superseded_by` 必須 | UT-AF-017, UT-AF-067, UT-AF-129 | カバー |
| ADR | INV-4 許可された状態遷移のみ実行できる | UT-AF-009〜025 | カバー |
| ADR | INV-5 `archgate.error_code` は `L{n}-{nnn}` 形式 | UT-AF-005, UT-AF-028, UT-AF-030, UT-AF-131, UT-AF-138 | カバー |
| ADR | INV-6 外部公開参照は `ADR-{NNN}` 形式 | UT-AF-037, UT-AF-046, UT-AF-113 | カバー |
| ADR | INV-7 `archgate.enforced_by` の組は重複不可 | UT-AF-006, UT-AF-031, UT-AF-103, UT-AF-132, UT-AF-139 | カバー |
| ADR | INV-8 本文は `Context / Decision / Consequences` 必須、`Alternatives` 任意 | UT-AF-004, UT-AF-026, UT-AF-027, UT-AF-080〜088 | カバー |

### エンティティ

該当なし。`adr-foundation` は `ADR` 単一集約で設計されており、集約内の独立エンティティは定義されていない。

### 値オブジェクト
| 対象 | 制約・ルール | 対応テストケース | カバー状態 |
|------|-------------|---------------|----------|
| AdrId | 3桁数字、`ADR-` 接頭辞正規化、数値変換、等価性、比較 | UT-AF-038〜049 | カバー |
| AdrStatus | 4状態の生成、遷移判定、等価性、Superseded判定 | UT-AF-050〜063 | カバー |
| AdrFrontmatter | 必須項目、日付形式、`superseded_by` 条件、archgate整合、イミュータブル遷移 | UT-AF-064〜079 | カバー |
| AdrBody | 必須3セクション、`alternatives` 任意、等価性 | UT-AF-080〜089 | カバー |
| ArchgateEntry | `validator_id` 形式、`error_code` 形式、一致判定、等価性 | UT-AF-090〜099 | カバー |
| ArchgateMapping | 1件以上必須、重複禁止、検索、存在判定、プリミティブ変換 | UT-AF-100〜111 | カバー |
| SupersededByRef | 有効なAdrId保持、`ADR-{NNN}` 変換、等価性 | UT-AF-112〜116 | カバー |
| AdrFilePath | `docs/ADR/{NNN}-{slug}.md` 形式、`template.md` 除外、AdrId抽出、等価性 | UT-AF-117〜126 | カバー |

補足: `AdrValidationService` の `validateFrontmatter`, `validateBody`, `validateArchgate` は UT-AF-127〜139 で全て検証されている。

## 4. UseCaseカバレッジ詳細
| UseCase名 | 正常系 | 異常系 | カバー状態 |
|----------|-------|-------|----------|
| GetAdrByRefUseCase | IT-AF-001, IT-AF-002, IT-AF-004 | IT-AF-003 | カバー |
| ListAdrsUseCase | IT-AF-005〜007, IT-AF-009 | IT-AF-008 | カバー |
| CreateAdrTemplateUseCase | IT-AF-010〜013 | IT-AF-014（`TemplateOutputConflictError` は未検証） | 部分 |
| SeedInitialAdrsUseCase | IT-AF-015〜017, IT-AF-020 | IT-AF-018, IT-AF-019 | カバー |
| ChangeAdrStatusUseCase | IT-AF-021〜024, IT-AF-028 | IT-AF-025〜027（`supersede` 時の `supersededBy` 未指定は未検証） | 部分 |
| ValidateAdrFrontmatterUseCase | IT-AF-029, IT-AF-031 | IT-AF-030, IT-AF-032 | カバー |
| ValidateAllAdrsUseCase | IT-AF-033, IT-AF-036, IT-AF-037 | IT-AF-034, IT-AF-035 | カバー |
| SearchArchgateMappingsUseCase | IT-AF-038〜040, IT-AF-042 | IT-AF-041 | カバー |

## 5. 未カバー項目一覧

### H05-02 AC-1: §12 Key Decisions の ADR 化（**達成済み・v0.176.0**）

第1訂正（WI-229）時点では 8 件が ADR 不在であったが、v0.175.0 で §12 の 11 決定を全て専用 ADR として起票し、v0.176.0 で per-AC binding を付与したことで達成済みとなった。key → ADR 対応（全件 status: Accepted、各 ADR は `## Context` に `> §12 Key Decision: <key>` marker を担持）:

- #1 パッケージ分離 → **ADR-022**（package-separation）
- #2 ESLint→Biome 全面移行 → **ADR-023**（eslint-to-biome）
- #3 K1-K13 品質ハーネス帰属 → **ADR-024**（k-requirements-quality-ownership）
- #4 FUSE Hooks Engine は v1 スコープ外 → **ADR-025**（fuse-out-of-scope）
- #5 HarnessError に fix_example 必須化 → **ADR-010**（harness-error-fix-example）
- #6 Quick Mode 適用条件の厳格定義 → **ADR-008**（quick-mode-eligibility）
- #7 設定ファイル分離 → **ADR-007**（config-file-separation）
- #8 Nyquist 統合（GSD-2 Truths/Artifacts）→ **ADR-026**（nyquist-truths-artifacts）
- #9 成果物駆動の状態導出 → **ADR-027**（artifact-driven-state）
- #10 スタック検出 → **ADR-028**（validator-stack-detection、§12 #10 は Decided へ確定）
- #11 L0→4層一時定義→5層復帰パス → **ADR-029**（four-to-five-layer-path）

検証は in-code 配列ではなく実コーパスに対して行う: `real-adr-corpus.it.test.ts` の AC-1 presence テスト（`@ac H05-02-1`）が、実 `docs/ADR/` の各 ADR raw markdown から marker を収集し、11 canonical key 全件の実在と、各 key が discovery + schema-valid な ADR に解決することを fail-closed でアサートする（marker 欠落時は欠落 key を名指しで失敗）。L3-005 acBoundStories に H05-02 を追加済み（fileFallbackOnly===0）。

### H05-02 AC-3: status 写像（**達成済み・v0.176.0**）

第1訂正時の §12 と in-code 定義配列の status 不一致は、§12 #10（validator-stack-detection）を Decided へ確定し it_test_design IT-AF-094 と整合させたことで解消済み。11 決定 ADR は全て status=Accepted（§12 Decided → ADR Accepted 写像に準拠）で、`real-adr-corpus.it.test.ts` の status テスト（`@ac H05-02-3`）が実コーパスの全 ADR status ∈ {Accepted, Proposed} を fail-closed 検証する。

### その他（実装前に補完すべき既存項目）

1. `H05-01` の「`docs/ADR/` に ADRテンプレートファイルを作成する」を直接保証するテストがない。既存ケースはテンプレート内容生成のみを検証しており、`docs/ADR/template.md` の実体配置までは担保していない。
2. `CreateAdrTemplateUseCase` の論理設計で定義されている `TemplateOutputConflictError` の異常系テストがない。
3. `ChangeAdrStatusUseCase` の `action=supersede` で `supersededBy` が未指定の場合の異常系テストがない。

## 6. 推奨追加ケース

1. `create-adr-template-use-case.test.ts` に、推奨出力先が既存ファイルと競合した場合に `TemplateOutputConflictError` を返すケースを追加する。
2. `change-adr-status-use-case.test.ts` に、`supersede` 実行時に `supersededBy` が欠落している場合の入力検証ケースを追加する。
3. `infrastructure` または `presentation` レベルで、`docs/ADR/template.md` が実体として存在し、frontmatterを機械可読に保ったまま参照テンプレートとして扱われることを確認するスモークケースを追加する。

## 7. 次のアクション

1. ~~**H05-02 AC-1 の充足**~~ **完了（v0.175.0/v0.176.0）**: §12 の 11 決定を全て ADR 化（ADR-022〜029 + 007/008/010）し、AC-1 presence テストで実コーパス実在を保証済み。
2. ~~**H05-02 AC-3 の整合**~~ **完了（v0.176.0）**: §12 #10 を Decided へ確定し it_test_design IT-AF-094 と整合。全 ADR status=Accepted。
3. ~~実コーパス membership 検証テストの追加 / per-AC binding 昇格~~ **完了（v0.176.0）**: `real-adr-corpus.it.test.ts` に AC-1 presence テストを追加し AC-1/2/3/4 へ `@ac H05-02-N` を付与。L3-005 acBoundStories += H05-02。
4. `it_test_design.md` に §6 の 3 ケースを追記し、UseCaseカバレッジの部分状態を解消する。（残タスク）
5. 各追記後に本レポートのサマリー値を再計算し、総合カバレッジを更新する。

> **注記（WI-231, v0.176.0）**: 第1訂正（WI-229）で明示的に追跡していた H05-02 AC-1 未達債務は、11 決定 ADR の起票 + AC-1 presence テスト + per-AC binding + L3-005 スコープ拡張により正規手順で返済した。本差し戻しは誤った網羅主張の再来ではなく、実在成果物（authored ADR + fail-closed テスト）に基づく正直なカバー宣言である。品質ゲート（L3-005）は緩めるどころか H05-02 を fail-closed 対象へ追加して強化した。
