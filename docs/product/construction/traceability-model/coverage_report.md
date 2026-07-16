# テストカバレッジレポート: traceability-model

<!-- WI-275: 本レポートは attestation ゲート返済済み（旧 coverage-gating マーカー除去）。各カバー主張に @attestation <story-id> を付与し、L2-016 が形状を、L3-007 が requirement-test-matrix 上での実在（story-id 解決 かつ testReferences>=1）を fail-closed で検証する。カバー印は「実在し pass するテストによる裏付け」を意味する。 -->

@story-id H03-01
@story-id H03-02
@story-id H03-03

> **2026-07-15 反ロンダリング訂正（WI-270）**: 本レポートの旧「カバー印 100%（32/32）」は、実在しないテストケース ID を カバー印 の根拠に引用した水増し（laundering）であった。実在する `UT-TM` は 042〜123、`IT-TM` は 001〜029 + 106 のみで、§3 の VO 節が引用する `UT-TM-001〜041` および §2 nyquist の `IT-TM-105` は存在しない。全 cited ID を `grep -rlF` で照合し、不在 ID を除去、実在 ID が 0 の行を ❌ へ格下げした。詳細は末尾「訂正履歴」を参照。

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 14 | 1 | 93.3% |
| ドメインロジック | 6 | 5 | 54.5% |
| UseCase | 6 | 0 | 100% |
| **総合** | **26** | **6** | **81.3%** |

> **訂正（2026-07-15, WI-270）**: 旧「総合 32/0 = 100%」は取消し。受け入れ基準 3.3-4 と、ドメインロジックの 5 VO（StoryId / ProjectRelativePath / MetadataTag / UnitReference / LayerReference）は、唯一の根拠 ID（`IT-TM-105` および `UT-TM-001〜041`）が実テストツリーに存在しないため ❌ とした。分子=カバー印 行数（AC 14 + domain 6 + UseCase 6 = 26）、分母=32。

### 判定結果
- カバー印 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要
- **今回の判定**: ⚠️ 81.3%（訂正後の実カバレッジ）。受け入れ基準・UseCase は概ね実在テストで裏付けられているが、§3 の VO 5 種は旧引用 `UT-TM-001〜041` が不在で未検証。実 UT-TM は 042 から始まるため、042 以降の VO（StoryReference 以降）のみ実テストで担保されている。

本Unitは `logical_design.md` で Presentation/API 実装を持たないため、APIカバレッジは評価対象外とした。

> **注記**: 実スイート `Tests 272 passed` は全て pass するが、それは実在する `UT-TM-042〜123` / `IT-TM-001〜029,106` が通るためであり、不在の `UT-TM-001〜041` / `IT-TM-105` とは無関係。実ソースは実装済みであり、これはテスト/引用のギャップである。

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
| StoryId | `HXX-XX` 形式、trim、legacy `US-XXX` 拒否、epic/story番号抽出 | 実装テスト不在（旧引用 UT-TM-001〜008 は不在） | ❌ 未カバー |
| ProjectRelativePath | 空文字・絶対パス・ルート脱出・バックスラッシュ・許可外ルートを拒否する | 実装テスト不在（旧引用 UT-TM-009〜020 は不在） | ❌ 未カバー |
| MetadataTag | タグ種別は4種のみ、value空文字禁止、lineNumberは1以上 | 実装テスト不在（旧引用 UT-TM-021〜030 / IT-TM-030〜039 は不在） | ❌ 未カバー |
| UnitReference | unresolved 時は `constructionRoot=null`、resolved 判定が一貫する | 実装テスト不在（旧引用 UT-TM-031〜035 / IT-TM-064〜068 は不在） | ❌ 未カバー |
| LayerReference | 正規語彙は `domain/application/infrastructure/presentation` のみ、legacy語彙は無効 | 実装テスト不在（旧引用 UT-TM-036〜041 は不在） | ❌ 未カバー |
| StoryReference | StoryId を保持し、resolved 状態で参照整合性を表現する | UT-TM-042, UT-TM-043, UT-TM-044, UT-TM-045 | ✅ カバー <!-- @attestation H03-01 --> |
| StoryIdAnnotation | 行番号は1以上、独立行判定と context 保持が必要 | UT-TM-046, UT-TM-047, UT-TM-048, UT-TM-049, UT-TM-050 | ✅ カバー <!-- @attestation H03-01 --> |
| DesignDocumentFlags | `initial_creation` により `@story-id` 必須有無が切り替わる | UT-TM-051, UT-TM-052, UT-TM-053, UT-TM-054, UT-TM-055, UT-TM-056 | ✅ カバー <!-- @attestation H03-01 --> |
| ChainLink | linkType は正規4値のみ、from/to 必須、broken 判定可能 | UT-TM-057, UT-TM-058, UT-TM-059, UT-TM-060, UT-TM-061 | ✅ カバー <!-- @attestation H03-01 --> |
| TraceabilityChain | origin整合、link順序、完全性判定、broken/resolved 抽出 | UT-TM-062, UT-TM-063, UT-TM-064, UT-TM-065, UT-TM-066, UT-TM-067, UT-TM-068, UT-TM-069, UT-TM-070 | ✅ カバー <!-- @attestation H03-01 --> |
| MetadataValidationResult | success/failure の整合、errors/warnings 判定、等価性 | UT-TM-071, UT-TM-072, UT-TM-073, UT-TM-074, UT-TM-075, UT-TM-076, UT-TM-077, UT-TM-078, UT-TM-079 | ✅ カバー <!-- @attestation H03-01 --> |

> **VO 訂正（2026-07-15, WI-270）**: 実在する `UT-TM` は **042 以降**にしか存在しない。StoryId / ProjectRelativePath / MetadataTag / UnitReference / LayerReference は旧引用の `UT-TM-001〜041`（および `IT-TM-030〜068` の一部）が全て不在のため ❌。StoryReference（UT-TM-042〜）以降の 6 VO は実在 `UT-TM-*` で裏付けられるため カバー印 を維持（範囲引用に混在した不在 ID は除去）。

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
| AC 3.3-4（nyquist トレーサビリティ検証） | ❌ | 旧引用 IT-TM-105 が不在 |
| StoryId VO | ❌ | 旧引用 UT-TM-001〜008 が不在（実 UT-TM は 042 から） |
| ProjectRelativePath VO | ❌ | 旧引用 UT-TM-009〜020 が不在 |
| MetadataTag VO | ❌ | 旧引用 UT-TM-021〜030 が不在 |
| UnitReference VO | ❌ | 旧引用 UT-TM-031〜035 が不在 |
| LayerReference VO | ❌ | 旧引用 UT-TM-036〜041 が不在 |

> いずれも実ソースは実装済みであり、テスト/引用のギャップであってフィーチャの欠落ではない。実 VO 単体テスト（UT-TM-001〜041 相当）および nyquist 統合テスト（IT-TM-105 相当）の追加・`@ac` 束縛は後続フェーズで行う。

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

実カバレッジは 81.3% であり、以下の未カバー項目に実テストを追加してから カバー印 へ復旧する（強制 green を禁止）。

1. StoryId / ProjectRelativePath / MetadataTag / UnitReference / LayerReference の VO 単体テストを追加する（現状 UT-TM は 042 以降しか実在しない）。
2. AC 3.3-4（nyquist トレーサビリティ）の統合テストを追加する。
3. 実テスト追加後に各 AC / VO を `@ac` 束縛し、L3-005（coverage-report 整合ゲート）で回帰を防止する。

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

**ungated-legacy マーカーは維持**（attestation 発行機構が未実装のため。WI-267 §5 の結論に従う）。カバー印 を新規追加していない。テストコードは一切変更していない。
