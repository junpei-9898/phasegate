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
| 受け入れ基準 | 13 | 10 | 56.5% |
| ドメインロジック | 39 | 0 | 100.0% |
| UseCase | 6 | 2 | 75.0% |
| **総合** | **58** | **12** | **82.9%** |

> **訂正履歴（WI-229）**: 旧版は H05-02「§12 Key Decision」11 行を全て「カバー」と記載していたが、これは**誤った網羅主張**であった。引用テスト IT-AF-015 / IT-AF-090 / IT-AF-094 は `SeedInitialAdrsUseCase` の「初期11件ADR定義配列」（in-code のロジック）を fixture/mock/論理設計 §5.5 の仕様と照合するのみで、**実 `docs/ADR/` コーパスに当該 11 決定を記録した ADR が実在すること**を一切アサートしない。実コーパス（`docs/ADR/001-021`）を §12 の権威ソース（`docs/product/harness_product_overview.md` §12、11 行）と突き合わせた結果、**11 件中 3 件のみが実 ADR として記録済み**であり、残り 8 件は ADR 不在（未作成）である。当該 8 行を「未カバー」へ訂正し、加えて AC-3（status 写像）も §12 と in-code 定義配列の status 不一致により未達（ギャップ）へ訂正、計 9 行が「カバー」→「未カバー」に反転した。サマリー値を再計算した（詳細は §2 の H05-02 行および §5 未カバー項目一覧）。なお SeedInitialAdrsUseCase および IT-AF-015/090/094 は現状の `scripts/harness/` に実装が存在せず（`it_test_design.md` の設計定義のみ）、実在するのは実コーパス検査の `real-adr-corpus.it.test.ts` だが、同テストは自身のコメントで H05-02 AC-1/2/3 への per-AC binding を明示的に scope 外と宣言している。

### 判定結果

H05-01 / H05-03 の網羅率は高いが、**H05-02 AC-1（§12 Key Decisions の ADR 化）は未達である**。§12 の 11 決定のうち実 `docs/ADR/` に記録されているのは 3 件（#5→ADR-010, #6→ADR-008, #7→ADR-007 に fold）のみで、8 件は ADR が未作成。加えて、実装開始前に補完すべき UseCase 系の未カバー項目が別途 2 件ある（`CreateAdrTemplateUseCase` / `ChangeAdrStatusUseCase` の異常系）ほか、`docs/ADR/template.md` の実体配置保証（H05-01）が未検証である。

## 2. 受け入れ基準カバレッジ詳細
| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|---------------|----------|
| H05-01 | `docs/ADR/` に ADRテンプレートファイルを作成する | IT-AF-010, IT-AF-011, IT-AF-095, IT-AF-096（内容生成は検証しているが `docs/ADR/template.md` の実体配置は未検証） | 未カバー |
| H05-01 | テンプレート構造が Title / Status / Context / Decision / Result / Alternatives を持つ | IT-AF-010, IT-AF-011, IT-AF-012, IT-AF-081, IT-AF-082 | カバー |
| H05-01 | YAMLフロントマターに `title`, `status`, `date`, `adr_id` を含み機械可読である | IT-AF-011, IT-AF-069, IT-AF-074, IT-AF-076 | カバー |
| H05-01 | archgateパターンを機械可読な形式で定義できる | UT-AF-090〜111, IT-AF-070, IT-AF-075, IT-AF-076 | カバー |
| H05-01 | ADRテンプレートのフロントマターに `archgate` オプショナル項目を追加できる | UT-AF-070, UT-AF-075〜078, IT-AF-012 | カバー |
| H05-02 | ADR「パッケージ分離（Quality Harness / Orchestration）」を作成する | 実 `docs/ADR/` に当該決定（パッケージ境界）を記録した ADR は不在。ADR-007 は「設定ファイル分離」を記録するのみでパッケージ境界決定は未記録。IT-AF-015/090/094 は SeedInitialAdrs の in-code 定義配列（論理設計 §5.5）を照合するのみで実コーパス実在を検証しない | 未カバー |
| H05-02 | ADR「ESLint→Biome全面移行」を作成する | 実 `docs/ADR/` に当該移行決定を記録した ADR は不在（未作成）。"ESLint" は ADR-007 に付随的に登場するのみで移行決定そのものは未記録。IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証 | 未カバー |
| H05-02 | ADR「K1-K13全て品質ハーネス側帰属」を作成する | 実 `docs/ADR/` に当該帰属決定を記録した ADR は不在（未作成）。IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証 | 未カバー |
| H05-02 | ADR「FUSE Hooks Engineはv1スコープ外」を作成する | 実 `docs/ADR/` に "FUSE" は 1 件も登場せず（`grep -rli fuse docs/ADR/` = 0 件）、当該決定を記録した ADR は不在。IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証 | 未カバー |
| H05-02 | ADR「HarnessErrorにfix_example必須化」を作成する | ADR-010（`010-harness-error-fix-example.md`, status: Accepted）が本決定を専用 ADR として記録済み。実コーパス conformance は `real-adr-corpus.it.test.ts` で fail-closed 検証される | カバー |
| H05-02 | ADR「Quick Mode適用条件の厳格定義」を作成する | ADR-008（`008-quick-mode.md`, status: Accepted）が本決定を専用 ADR として記録済み。実コーパス conformance は `real-adr-corpus.it.test.ts` で fail-closed 検証される | カバー |
| H05-02 | ADR「設定ファイル分離（phasegate.config.json / orchestration.config.json）」を作成する | ADR-007（`007-harness-config-single-source.md`, status: Accepted）の「パッケージ分離」サブセクションに `orchestration.config.json` との設定ファイル分離として fold 済み（専用 ADR ではないが決定は記録されている）。実コーパス conformance は `real-adr-corpus.it.test.ts` で検証される | カバー |
| H05-02 | ADR「Nyquist統合（GSD-2 Truths/Artifacts検証パターン）」を作成する | 実 `docs/ADR/` に当該統合決定を記録した ADR は不在。ADR-003 は nyquist L3 バリデータを定義するが GSD-2 統合決定は未記録。IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証 | 未カバー |
| H05-02 | ADR「成果物駆動の状態導出」を作成する | 実 `docs/ADR/` に当該決定を記録した ADR は不在（未作成、コーパス全体に該当記述なし）。IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証 | 未カバー |
| H05-02 | ADR「スタック検出（バリデータ無限ループ防止）」を作成する | 実 `docs/ADR/` に当該決定を記録した ADR は不在（コーパス全体に該当記述なし）。加えて §12 では本行のみ Status=**Pending**（未決定）であり、そもそも ADR 化対象として確定していない。IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証 | 未カバー |
| H05-02 | ADR「L0→4層一時定義→5層復帰パス」を作成する | 実 `docs/ADR/` に当該決定を記録した ADR は不在（未作成）。IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証 | 未カバー |
| H05-02 | 各ADRがH05-01テンプレート構造に準拠する | IT-AF-015, IT-AF-019, IT-AF-077〜083, IT-AF-085〜089 | カバー |
| H05-02 | §12でDecided済みのものは `Accepted`、検討中は `Proposed` である | IT-AF-092/094 は SeedInitialAdrs の in-code 定義配列内の status のみ検証する。**§12 権威ソースと当該配列は status が不一致**（下記「ステータス不一致」参照）: §12 は #10 スタック検出のみ Pending・他は Decided とするのに対し、配列は #4 FUSE/#8 Nyquist/#11 L0→5層 を Proposed・#10 を Accepted とする。両ソースが決着状態で食い違うため、AC-3 の「Decided→Accepted / 検討中→Proposed」写像を実コーパスに対して一貫適用できず、AC-3 は**未達（ギャップ）**。上記 8 ADR 不在とも重なる | 未カバー |
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

### H05-02 AC-1: §12 Key Decisions の ADR 化（未達）

**根本原因**: AC の文言は「`docs/ADR/` に ADR を作成する」＝実コーパス上の成果物を求めるものだが、旧版が引用していた IT-AF-015/090/094 は SeedInitialAdrsUseCase の in-code「初期11件ADR定義配列」を fixture/論理設計 §5.5 と照合するに過ぎず、実 `docs/ADR/` に当該決定を記録した ADR が実在することを一切検証しない。§12 の 11 決定を実コーパスと突合した結果は以下:

- **カバー済み（3件、実 ADR として記録あり）**:
  - #5 HarnessError に fix_example 必須化 → **ADR-010**（専用）
  - #6 Quick Mode 適用条件の厳格定義 → **ADR-008**（専用）
  - #7 設定ファイル分離（phasegate.config.json / orchestration.config.json）→ **ADR-007** の「パッケージ分離」サブセクションに fold（専用 ADR ではない）
- **未カバー（8件、ADR 不在＝要作成）**: #1 パッケージ分離（Quality Harness/Orchestration、パッケージ境界）／#2 ESLint→Biome 全面移行／#3 K1-K13 全て品質ハーネス側帰属／#4 FUSE Hooks Engine は v1 スコープ外（`docs/ADR/` に "FUSE" は 0 件）／#8 Nyquist 統合（GSD-2 Truths/Artifacts）／#9 成果物駆動の状態導出／#10 スタック検出（§12 では Pending のため ADR 化対象として未確定）／#11 L0→4層一時定義→5層復帰パス

したがって **H05-02 AC-1 は未達**（8 件の ADR を新規作成する必要がある）。#10 は §12 が Pending であるため、まず決定を確定させるか対象外とするかの整理が前段に必要。

### H05-02 AC-3: status 写像のギャップ（ステータス不一致）

§12（権威ソース）と SeedInitialAdrsUseCase の in-code 定義配列（IT-AF-094 が照合する 論理設計 §5.5 の想定）とで、どの決定が決着済みかが食い違う:

| 決定 | §12 の Status | in-code 配列の status |
|------|--------------|----------------------|
| #4 FUSE Hooks Engine は v1 スコープ外 | Decided | Proposed |
| #8 Nyquist 統合 | Decided | Proposed |
| #10 スタック検出 | **Pending** | Accepted |
| #11 L0→5層復帰パス | Decided | Proposed |

AC-3 の「Decided→Accepted / 検討中→Proposed」写像を実コーパスへ一貫適用できないため、AC-3 は未達（ギャップ）。ADR 新規作成時に、いずれのソースを正とするか（§12 を権威とする想定）を確定させて両者を整合させる必要がある。

### その他（実装前に補完すべき既存項目）

1. `H05-01` の「`docs/ADR/` に ADRテンプレートファイルを作成する」を直接保証するテストがない。既存ケースはテンプレート内容生成のみを検証しており、`docs/ADR/template.md` の実体配置までは担保していない。
2. `CreateAdrTemplateUseCase` の論理設計で定義されている `TemplateOutputConflictError` の異常系テストがない。
3. `ChangeAdrStatusUseCase` の `action=supersede` で `supersededBy` が未指定の場合の異常系テストがない。

## 6. 推奨追加ケース

1. `create-adr-template-use-case.test.ts` に、推奨出力先が既存ファイルと競合した場合に `TemplateOutputConflictError` を返すケースを追加する。
2. `change-adr-status-use-case.test.ts` に、`supersede` 実行時に `supersededBy` が欠落している場合の入力検証ケースを追加する。
3. `infrastructure` または `presentation` レベルで、`docs/ADR/template.md` が実体として存在し、frontmatterを機械可読に保ったまま参照テンプレートとして扱われることを確認するスモークケースを追加する。

## 7. 次のアクション

1. **H05-02 AC-1 の充足**: §12 の未記録 8 決定（#1/#2/#3/#4/#8/#9/#10/#11）について実 `docs/ADR/` に ADR を新規作成する。#10 は §12 が Pending のため、先に決定を確定させるか対象外とするかを整理する。
2. **H05-02 AC-3 の整合**: §12（権威ソース）と in-code 定義配列（論理設計 §5.5）の status 不一致（#4/#8/#10/#11）を、§12 を正として揃える。ADR 作成時に status を §12 準拠で設定する。
3. 上記完了後、実コーパスに対して §12 決定の membership を検証するテスト（`real-adr-corpus.it.test.ts` の拡張または per-AC binding の昇格）を追加し、in-code 配列ではなく実 ADR の実在で AC-1/2/3 を保証する。
4. `it_test_design.md` に §6 の 3 ケースを追記し、UseCaseカバレッジの部分状態を解消する。
5. 各追記後に本レポートのサマリー値を再計算し、総合カバレッジを更新する。

> **注記（WI-229）**: 本訂正は誤った網羅主張を実態に合わせただけであり、品質ゲートを緩めるものではない。H05-02 AC-1 は未達債務として明示的に追跡され、8 件の ADR 作成が完了するまで「達成済み」と扱ってはならない。
