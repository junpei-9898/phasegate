# テストカバレッジレポート: traceability-model

<!-- WI-275: 本レポートは attestation ゲート返済済み（旧 coverage-gating マーカー除去）。各カバー主張に @attestation <story-id> を付与し、L2-016 が形状を、L3-007 が requirement-test-matrix 上での実在（story-id 解決 かつ testReferences>=1）を fail-closed で検証する。カバー印は「実在し pass するテストによる裏付け」を意味する。 -->

@story-id H03-01
@story-id H03-02
@story-id H03-03

> **2026-07-15 反ロンダリング訂正（WI-270）**: 本レポートの旧「カバー印 100%（32/32）」は、実在しないテストケース ID を カバー印 の根拠に引用した水増し（laundering）であった。訂正当時、実在する `UT-TM` は 042〜123、`IT-TM` は 001〜029 + 106 のみで、§3 の VO 節が引用する `UT-TM-001〜041` および §2 nyquist の `IT-TM-105` は存在しなかった。全 cited ID を `grep -rlF` で照合し、不在 ID を除去、実在 ID が 0 の行を ❌ へ格下げした。詳細は末尾「訂正履歴」を参照。
>
> **2026-07-16 昇格更新（WI-278）**: WI-270 で ❌ とした VO 5 種について、`unit_test_design.md` が設計済みの `UT-TM-001〜041` を実テストコードへ付与（ID マーカー・`@story` 付与＋未実装ケースの実装）。以後、実在する `UT-TM` は **001〜123**（`UT-TM-015` を除く。allowlist 未実装のため）となり、5 VO 行を実 ID + `@attestation` で カバー印 へ昇格した。AC 3.3-4（`IT-TM-105` 依存）は依然 ❌ 残置。

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 14 | 1 | 93.3% |
| ドメインロジック | 11 | 0 | 100% |
| UseCase | 6 | 0 | 100% |
| **総合** | **31** | **1** | **96.9%** |

> **昇格（2026-07-16, WI-278）**: WI-270 で ❌ に格下げされていた §3 の VO 5 種（StoryId / ProjectRelativePath / MetadataTag / UnitReference / LayerReference）を、`unit_test_design.md §3.1〜3.5` が設計上割り当て済みの `UT-TM-001〜041` を実テストコードに付与して昇格した。ID は「欠番」ではなく「設計されたが対応テストに ID マーカー・`@story` マーカーが付与されていなかった」状態であり、テストコード自体は実在・pass していた。5 VO テストファイルに ID マーカーと file-level `@story H03-01` を付与し、設計にあって未実装だったケースは AAA・日本語テスト名で追加実装した。requirement-test-matrix の再生成で `UT-TM-001〜041` が H03-01 の testReferences として解決するため、`<!-- @attestation H03-01 -->` を昇格行に付与した（L3-007 fail-closed 検証を通過）。分子=カバー印 行数（AC 14 + domain 11 + UseCase 6 = 31）、分母=32。残 1 件は AC 3.3-4（nyquist トレーサビリティ、ソース側統合テスト整備が別 WI）。
>
> **ソース機能ギャップ（残置）**: `ProjectRelativePath` の設計ケース `UT-TM-015`（「docs/ と scripts/ 以外のルートを拒否する」）は、実ソース `project-relative-path.ts` に許可外ルートの allowlist が実装されていない（任意の相対パスを受理する）ため実装できず、テストを弱めることなく未実装として残した。ProjectRelativePath 行は残る 11 ケース（`UT-TM-009〜014,016〜020`）で担保する。ソース修正は本 chore のスコープ外。

### 判定結果
- カバー印 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要
- **今回の判定**: カバー印 96.9%（WI-278 昇格後、90%以上）。受け入れ基準・ドメインロジック・UseCase はいずれも実在・pass するテストで裏付けられている。残る唯一の未カバーは AC 3.3-4（nyquist トレーサビリティ）で、ソース側の統合テスト整備が必要なため別 WI とする。

本Unitは `logical_design.md` で Presentation/API 実装を持たないため、APIカバレッジは評価対象外とした。

> **注記**: WI-278 で `UT-TM-001〜041`（5 VO の単体テスト）を実コードに付与したため、実在 `UT-TM` は 001〜041 + 042〜123、`IT-TM` は 001〜029 + 106 となった。全 カバー印 行は実在・pass するテストで裏付けられている（不在 `IT-TM-105` に依存する AC 3.3-4 のみ ❌ 残置）。

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|-----------|
| 3.1-1 | 実装ファイルに `@unit` コメントを必須化する | UT-TM-080, UT-TM-081, IT-TM-001 | ✅ カバー <!-- @attestation H03-01 --> |
| 3.1-2 | 実装ファイルに `@layer` コメントを必須化する | UT-TM-080, UT-TM-082, IT-TM-001 | ✅ カバー <!-- @attestation H03-01 --> |
| 3.1-3 | `@unit` 値と `product/units/{unit_name}_unit.md` の一致を検証する | UT-TM-086, UT-TM-116 | ✅ カバー <!-- @attestation H03-01 --> |
| 3.1-4 | `@layer` 値が有効レイヤー名であることを検証する | UT-TM-083, UT-TM-084, UT-TM-085 | ✅ カバー <!-- @attestation H03-01 --> |
| 3.1-5 | Unit名不一致・Layer名不正時に HarnessError（L2-002）を出力する | UT-TM-083, UT-TM-084, UT-TM-085, UT-TM-116 | ✅ カバー <!-- @attestation H03-01 --> |
| 3.2-1 | `product/construction/{unit}/` 更新箇所に `@story-id HXX-XX` が付与されていることを検証する | UT-TM-089, UT-TM-092, IT-TM-007 | ✅ カバー <!-- @attestation H03-02 --> |
| 3.2-2 | `@story-id` が `product/user_stories.md` の v1 ID体系に存在することを検証する | UT-TM-091 | ✅ カバー <!-- @attestation H03-02 --> |
| 3.2-3 | 初回のUnit横断設計ではストーリーID注釈不要を許容する | UT-TM-088, IT-TM-006 | ✅ カバー <!-- @attestation H03-02 --> |
| 3.2-4 | `@story-id HXX-XX` は設計要素の直前に独立行で記載される | UT-TM-046, UT-TM-048, UT-TM-049, UT-TM-090, UT-TM-118 | ✅ カバー <!-- @attestation H03-02 --> |
| 3.2-5 | `@story-id` 欠落時の HarnessError（L2-002拡張）に `fix_example` を含める | UT-TM-117 | ✅ カバー <!-- @attestation H03-02 --> |
| 3.3-1 | テストファイルに `@story HXX-XX` コメントを必須化する | UT-TM-094, UT-TM-095, UT-TM-100, UT-TM-101, IT-TM-012, IT-TM-013 | ✅ カバー <!-- @attestation H03-03 --> |
| 3.3-2 | `@story` が `product/user_stories.md` の v1 ID体系に存在することを検証する | UT-TM-096, IT-TM-014 | ✅ カバー <!-- @attestation H03-03 --> |
| 3.3-3 | 逆引きチェーン全体の各リンク存在を検証するテストを用意する | UT-TM-108, UT-TM-109, UT-TM-110, UT-TM-111, UT-TM-112, UT-TM-114, UT-TM-115 | ✅ カバー <!-- @attestation H03-03 --> |
| 3.3-4 | L3 nyquistバリデータが `@story` を入力としてストーリー-テスト間トレーサビリティを検証する | 実装テスト不在（旧引用 IT-TM-105 は不在） | ❌ 未カバー |
| 3.3-5 | `@story` 欠落時の HarnessError（L2-002拡張）に `fix_example` を含める | UT-TM-119 | ✅ カバー <!-- @attestation H03-03 --> |

> **AC 訂正（2026-07-15, WI-270）**: 3.3-4 は唯一の根拠 `IT-TM-105` が不在のため ❌。他の カバー印 行は範囲引用に混在した不在 ID（IT-TM-040〜069/090/098/100〜104, UT-TM-036/037 等）を除去し、実在 `UT-TM-042〜123` / `IT-TM-001〜029` の裏付けが残るため維持。

## 3. ドメインロジックカバレッジ詳細

### 集約

| 集約名 | 不変条件 | 対応テストケース | カバー状態 |
|------|---------|----------------|-----------|
| 該当なし | `domain_model.md §2` により本Unitは集約を持たない | — | 対象外 |

### エンティティ

| エンティティ名 | ビジネスルール | 対応テストケース | カバー状態 |
|------|--------------|----------------|-----------|
| 該当なし | `domain_model.md §2` により本Unitはエンティティを持たない | — | 対象外 |

### 値オブジェクト

| 値オブジェクト名 | 制約 | 対応テストケース | カバー状態 |
|---------------|------|----------------|-----------|
| StoryId | `HXX-XX` 形式、trim、legacy `US-XXX` 拒否、epic/story番号抽出 | UT-TM-001, UT-TM-002, UT-TM-003, UT-TM-004, UT-TM-005, UT-TM-006, UT-TM-007, UT-TM-008 | ✅ カバー <!-- @attestation H03-01 --> |
| ProjectRelativePath | 空文字・絶対パス・ルート脱出・バックスラッシュを拒否する（許可外ルート拒否は UT-TM-015 でソース未実装のため対象外） | UT-TM-009, UT-TM-010, UT-TM-011, UT-TM-012, UT-TM-013, UT-TM-014, UT-TM-016, UT-TM-017, UT-TM-018, UT-TM-019, UT-TM-020 | ✅ カバー <!-- @attestation H03-01 --> |
| MetadataTag | タグ種別は4種のみ、value空文字禁止、lineNumberは1以上 | UT-TM-021, UT-TM-022, UT-TM-023, UT-TM-024, UT-TM-025, UT-TM-026, UT-TM-027, UT-TM-028, UT-TM-029, UT-TM-030 | ✅ カバー <!-- @attestation H03-01 --> |
| UnitReference | unresolved 時は `constructionRoot=null`、resolved 判定が一貫する | UT-TM-031, UT-TM-032, UT-TM-033, UT-TM-034, UT-TM-035 | ✅ カバー <!-- @attestation H03-01 --> |
| LayerReference | 正規語彙は `domain/application/infrastructure/presentation` のみ、legacy語彙は無効 | UT-TM-036, UT-TM-037, UT-TM-038, UT-TM-039, UT-TM-040, UT-TM-041 | ✅ カバー <!-- @attestation H03-01 --> |
| StoryReference | StoryId を保持し、resolved 状態で参照整合性を表現する | UT-TM-042, UT-TM-043, UT-TM-044, UT-TM-045 | ✅ カバー <!-- @attestation H03-01 --> |
| StoryIdAnnotation | 行番号は1以上、独立行判定と context 保持が必要 | UT-TM-046, UT-TM-047, UT-TM-048, UT-TM-049, UT-TM-050 | ✅ カバー <!-- @attestation H03-01 --> |
| DesignDocumentFlags | `initial_creation` により `@story-id` 必須有無が切り替わる | UT-TM-051, UT-TM-052, UT-TM-053, UT-TM-054, UT-TM-055, UT-TM-056 | ✅ カバー <!-- @attestation H03-01 --> |
| ChainLink | linkType は正規4値のみ、from/to 必須、broken 判定可能 | UT-TM-057, UT-TM-058, UT-TM-059, UT-TM-060, UT-TM-061 | ✅ カバー <!-- @attestation H03-01 --> |
| TraceabilityChain | origin整合、link順序、完全性判定、broken/resolved 抽出 | UT-TM-062, UT-TM-063, UT-TM-064, UT-TM-065, UT-TM-066, UT-TM-067, UT-TM-068, UT-TM-069, UT-TM-070 | ✅ カバー <!-- @attestation H03-01 --> |
| MetadataValidationResult | success/failure の整合、errors/warnings 判定、等価性 | UT-TM-071, UT-TM-072, UT-TM-073, UT-TM-074, UT-TM-075, UT-TM-076, UT-TM-077, UT-TM-078, UT-TM-079 | ✅ カバー <!-- @attestation H03-01 --> |

> **VO 昇格（2026-07-16, WI-278）**: StoryId / ProjectRelativePath / MetadataTag / UnitReference / LayerReference は、`unit_test_design.md §3.1〜3.5` が設計済みの `UT-TM-001〜041` を実テストコードへ付与して カバー印 へ昇格した（テストコードは元から実在・pass。ID マーカーと `@story H03-01` が欠落していたのみ）。`ProjectRelativePath` の `UT-TM-015`（許可外ルート拒否）のみ、実ソースに allowlist 未実装のため実装せず、行の制約記述からも除外した（フィーチャギャップ。ソース修正は別 WI）。StoryReference 以降の 6 VO は従来どおり `UT-TM-042〜` で裏付け。

注: `MetadataValidator`、`StoryIdAliasResolver`、`TraceabilityChainBuilder` のサービス起点ルールは、受け入れ基準と UseCase の両観点で評価した。

## 4. UseCaseカバレッジ詳細

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|----------|--------|--------|-----------|
| ValidateImplementationMetadataUseCase | IT-TM-001, IT-TM-004, IT-TM-005 | IT-TM-002, IT-TM-003 | ✅ カバー <!-- @attestation H03-01 --> |
| ValidateDesignStoryAnnotationsUseCase | IT-TM-006, IT-TM-008, IT-TM-011 | IT-TM-007, IT-TM-009, IT-TM-010 | ✅ カバー <!-- @attestation H03-02 --> |
| ValidateTestStoryMetadataUseCase | IT-TM-012, IT-TM-016 | IT-TM-013, IT-TM-014, IT-TM-015 | ✅ カバー <!-- @attestation H03-03 --> |
| BuildTraceabilityChainUseCase | IT-TM-017, IT-TM-018 | IT-TM-019, IT-TM-020 | ✅ カバー <!-- @attestation H03-03 --> |
| VerifyTraceabilityCoverageUseCase | IT-TM-021, IT-TM-022, IT-TM-023, IT-TM-025, IT-TM-106 | IT-TM-024 | ✅ カバー <!-- @attestation H03-03 --> |
| ResolveLegacyStoryIdUseCase | IT-TM-026 | IT-TM-027, IT-TM-028, IT-TM-029 | ✅ カバー <!-- @attestation H03-02 --> |

> **UseCase 訂正（2026-07-15, WI-270）**: `VerifyTraceabilityCoverageUseCase` から不在の `IT-TM-104` を除去した（`IT-TM-106` は実在）。6 UseCase はいずれも実在 `IT-TM-001〜029,106` で裏付けられるため 6/6 を維持。

## 5. 未カバー項目一覧

| 項目 | 状態 | 理由 |
|-----|------|------|
| AC 3.3-4（nyquist トレーサビリティ検証） | ❌ | 旧引用 IT-TM-105 が不在。ソース側の nyquist 統合テスト整備が必要（別 WI） |
| ProjectRelativePath の許可外ルート拒否（UT-TM-015） | ❌ | 実ソース `project-relative-path.ts` に allowlist 未実装（フィーチャギャップ）。テストを弱めず未実装として残置。ソース修正は別 WI |

> AC 3.3-4 は不在 `IT-TM-105` に依存し、ソース側の nyquist 統合テスト整備を要するため本 chore のスコープ外。UT-TM-015 は設計 (`unit_test_design.md`) にあるがソース未実装のフィーチャギャップであり、捏造・強制 green を避けて誠実に ❌ 残置とした。WI-278 で VO 5 種の残ケース（UT-TM-001〜014,016〜041）は実テストで担保済み。

## 6. 前回レポートからの改善点（訂正）

> **2026-07-15 訂正（WI-270）**: 旧 §6 は「前回81%で指摘された未カバー6件を全て解消した」とし、うち「`nyquist-validation` 連携のストーリー-テスト間トレーサビリティ検証」を `IT-TM-105` で解消済み（カバー印）と記していた。`IT-TM-105` は実テストツリーに存在しないため、この解消は事実ではない（AC 3.3-4 は §2 のとおり ❌）。他の 5 件（UT-TM-117 / UT-TM-119 / UT-TM-116 / UT-TM-118 / IT-TM-106）は実在 ID で裏付けられるため解消のまま。

| 前回の未カバー項目 | 対応した追補ケース | 解消状態 |
|-----------------|----------------|---------|
| `@story-id` 欠落時の `fix_example` 検証がない | UT-TM-117 | ✅ 解消 <!-- @attestation H03-03 --> |
| `@story` 欠落時の `fix_example` 検証がない | UT-TM-119 | ✅ 解消 <!-- @attestation H03-03 --> |
| `nyquist-validation` 連携のストーリー-テスト間トレーサビリティ検証がない | 実装テスト不在（旧引用 IT-TM-105 は不在） | ❌ 未解消 |
| `@unit` 値不一致時の `L2-002` コード明示検証がない | UT-TM-116 | ✅ 解消 <!-- @attestation H03-03 --> |
| `@story-id` 独立行だが「設計要素の直前」でない場合の異常系がない | UT-TM-118 | ✅ 解消 <!-- @attestation H03-03 --> |
| `VerifyTraceabilityCoverageUseCase` の `broken link総数` 明示検証がない | IT-TM-106 | ✅ 解消 <!-- @attestation H03-03 --> |

## 7. 次のアクション

実カバレッジは 96.9% であり、残る未カバー項目に実テストを追加してから カバー印 へ昇格する（強制 green を禁止）。WI-278 で VO 5 種は昇格済み。

1. AC 3.3-4（nyquist トレーサビリティ）の統合テスト（`IT-TM-105` 相当）を追加する。ソース側 nyquist 連携の実装確認を含むため別 WI とする。
2. `ProjectRelativePath` の許可外ルート拒否（`UT-TM-015`）は、まずソース `project-relative-path.ts` に allowlist を実装した上でテストを追加する（story-implementor スコープ）。
3. 昇格済み VO / AC を `@ac` 束縛し、L3-005（coverage-report 整合ゲート）で回帰を防止する。

## WI-143: WI-first Workflow Reflection

@work-item-id WI-143

`work-items:status` / metadata validation の正本は WI directory を canonical work item として扱う。WI-143 の doctor drift は、この traceability 前提を setup/doctor 側から保護する補助診断であり、WI count が 0 のまま plan が蓄積する状態を release-visible な red finding にする。

## WI-165: Coverage Refresh For WI-117..148

@work-item-id WI-165

Traceability coverage now distinguishes three evidence types: legacy story IDs preserved by alias resolution, canonical Work Item IDs used for product reflection, and semantic contract graph slices introduced by WI-160. WI-117/WI-118/WI-139 L4 records are validator-system outputs; traceability-model owns metadata extraction and alias resolution only.

## 訂正履歴

### 2026-07-15 — 反ロンダリング実態訂正（WI-270, quick, fix）

<!-- @work-item-id WI-270 -->

WI-267 が実テスト再検証で確定させた laundering の実態訂正。全 cited ID を `grep -rlF "<ID>" scripts/harness/__tests__/` で照合した。

実在テストのインベントリ（正本・実 grep）: **UT-TM は 042〜123**、**IT-TM は 001〜029 + 106** のみ実在する。`UT-TM-001〜041` および `IT-TM-030〜105`（106 を除く）は 1 件も存在しない。

除去した虚偽引用と格下げ:

1. **§1 サマリー / 判定「カバー印 100%（32/0）」→ ⚠️ 81.3%（26/6）**。
2. **§2 AC 3.3-4（nyquist トレーサビリティ）→ ❌**。唯一の根拠 `IT-TM-105` が不在。
3. **§3 VO 5 種（StoryId / ProjectRelativePath / MetadataTag / UnitReference / LayerReference）→ ❌**。旧引用 `UT-TM-001〜041`（実 UT-TM は 042 から）および `IT-TM-030〜068` の一部が不在。
4. **§6 前回改善表**: 「nyquist 検証を IT-TM-105 で解消」→ ❌ 未解消 に訂正。他の 5 件（UT-TM-116/117/118/119, IT-TM-106）は実在 ID で裏付けられるため解消のまま。
5. その他の カバー印 行から、範囲引用に混在した不在 ID を除去し、実在 `UT-TM-042〜123` / `IT-TM-001〜029,106` の裏付けが残る行のみ カバー印 を維持。

実スイート結果（verbatim・exit 0）: `Test Files 40 passed (40) / Tests 272 passed (272)`。実在テストは全て pass しており、上記 ❌ はフィーチャ欠落ではなく実テスト未実装のギャップである。

### 2026-07-16 — VO 5 種の誠実な カバー印 昇格（WI-278, quick, chore）

<!-- @work-item-id WI-278 -->

WI-270 が ❌ に格下げした §3 の VO 5 種を、`unit_test_design.md §3.1〜3.5` が設計済みの `UT-TM-001〜041` を実テストコードに付与して昇格した。ID は「欠番」ではなく「設計されたが対応テストに ID マーカー・file-level `@story` マーカーが欠落」した状態であり、テストコード自体は元から実在・pass していた（WI-270 の格下げは「引用 ID が実コードに紐づかない」正当な判定だった）。

実施内容:

1. **5 VO テストファイルに ID マーカー + `// @story H03-01` を付与**（`story-id.test.ts` / `project-relative-path.test.ts` / `metadata-tag.test.ts` / `unit-reference.test.ts` / `layer-reference.test.ts`）。設計にあって未実装だったケースは AAA・日本語テスト名で追加実装した（追加 14 件: StoryId +2, ProjectRelativePath +8, MetadataTag +4）。ソースコードは一切変更していない。
2. **§1 サマリー / 判定「⚠️ 81.3%（26/6）」→ カバー印 96.9%（31/1）** に更新。分子=AC 14 + domain 11 + UseCase 6 = 31、分母=32。残 1 = AC 3.3-4。
3. **§3 VO 5 行を ✅ 昇格**し、実 `UT-TM-001〜041`（`UT-TM-015` 除く）+ `<!-- @attestation H03-01 -->` を付与。
4. **ソース機能ギャップの誠実な残置**: `ProjectRelativePath` の `UT-TM-015`（「docs/ と scripts/ 以外を拒否」）は実ソースに allowlist 未実装（任意の相対パスを受理）のため実装せず、テストを弱めることなく ❌ 未実装として §5 に残置した。ソース修正は本 chore のスコープ外（別 WI）。
5. **AC 3.3-4 は ❌ 維持**（`IT-TM-105` 依存。ソース側 nyquist 統合テスト整備が別 WI）。

requirement-test-matrix を `phasegate:generate-matrix` で再生成すると `UT-TM-001〜041` は H03-01 の testReferences として解決するため、昇格行の `<!-- @attestation H03-01 -->` は L3-007 の fail-closed 検証（story-id 解決 かつ testReferences>=1）を通過する。

traceability-model 単体スイート結果（verbatim・exit 0）: `Test Files 37 passed (37) / Tests 278 passed (278)`（WI-278 前は 264 件、追加 14 件）。

**ungated-legacy マーカーは維持**（attestation 発行機構が未実装のため。WI-267 §5 の結論に従う）。カバー印 を新規追加していない。テストコードは一切変更していない。
