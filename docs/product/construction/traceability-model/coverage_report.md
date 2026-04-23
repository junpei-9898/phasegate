# テストカバレッジレポート: traceability-model

@story-id H03-01
@story-id H03-02
@story-id H03-03
## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 15 | 0 | 100% |
| ドメインロジック | 11 | 0 | 100% |
| UseCase | 6 | 0 | 100% |
| **総合** | **32** | **0** | **100%** |

### 判定結果
- ✅ 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要
- **今回の判定**: ✅ 100% のため、テストロジック設計に進んで問題なし

本Unitは `logical_design.md` で Presentation/API 実装を持たないため、APIカバレッジは評価対象外とした。

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|-----------|
| 3.1-1 | 実装ファイルに `@unit` コメントを必須化する | UT-TM-080, UT-TM-081, IT-TM-001, IT-TM-098 | ✅ カバー |
| 3.1-2 | 実装ファイルに `@layer` コメントを必須化する | UT-TM-080, UT-TM-082, IT-TM-001, IT-TM-098 | ✅ カバー |
| 3.1-3 | `@unit` 値と `product/units/{unit_name}_unit.md` の一致を検証する | UT-TM-086, UT-TM-116, IT-TM-064, IT-TM-065, IT-TM-066, IT-TM-069 | ✅ カバー |
| 3.1-4 | `@layer` 値が有効レイヤー名であることを検証する | UT-TM-036, UT-TM-037, UT-TM-083, UT-TM-084, UT-TM-085 | ✅ カバー |
| 3.1-5 | Unit名不一致・Layer名不正時に HarnessError（L2-002）を出力する | UT-TM-083, UT-TM-084, UT-TM-085, UT-TM-116, IT-TM-090, IT-TM-098 | ✅ カバー |
| 3.2-1 | `product/construction/{unit}/` 更新箇所に `@story-id HXX-XX` が付与されていることを検証する | UT-TM-089, UT-TM-092, IT-TM-007 | ✅ カバー |
| 3.2-2 | `@story-id` が `product/user_stories.md` の v1 ID体系に存在することを検証する | UT-TM-091, IT-TM-052, IT-TM-058, IT-TM-060 | ✅ カバー |
| 3.2-3 | 初回のUnit横断設計ではストーリーID注釈不要を許容する | UT-TM-088, IT-TM-006, IT-TM-047 | ✅ カバー |
| 3.2-4 | `@story-id HXX-XX` は設計要素の直前に独立行で記載される | UT-TM-046, UT-TM-048, UT-TM-049, UT-TM-090, UT-TM-118, IT-TM-040, IT-TM-041, IT-TM-042 | ✅ カバー |
| 3.2-5 | `@story-id` 欠落時の HarnessError（L2-002拡張）に `fix_example` を含める | UT-TM-117 | ✅ カバー |
| 3.3-1 | テストファイルに `@story HXX-XX` コメントを必須化する | UT-TM-094, UT-TM-095, UT-TM-100, UT-TM-101, IT-TM-012, IT-TM-013 | ✅ カバー |
| 3.3-2 | `@story` が `product/user_stories.md` の v1 ID体系に存在することを検証する | UT-TM-096, IT-TM-014, IT-TM-058, IT-TM-060 | ✅ カバー |
| 3.3-3 | 逆引きチェーン全体の各リンク存在を検証するテストを用意する | UT-TM-108, UT-TM-109, UT-TM-110, UT-TM-111, UT-TM-112, UT-TM-114, UT-TM-115, IT-TM-100, IT-TM-101, IT-TM-102, IT-TM-103, IT-TM-104 | ✅ カバー |
| 3.3-4 | L3 nyquistバリデータが `@story` を入力としてストーリー-テスト間トレーサビリティを検証する | IT-TM-105 | ✅ カバー |
| 3.3-5 | `@story` 欠落時の HarnessError（L2-002拡張）に `fix_example` を含める | UT-TM-119 | ✅ カバー |

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
| StoryId | `HXX-XX` 形式、trim、legacy `US-XXX` 拒否、epic/story番号抽出 | UT-TM-001, UT-TM-002, UT-TM-003, UT-TM-004, UT-TM-005, UT-TM-006, UT-TM-007, UT-TM-008 | ✅ カバー |
| ProjectRelativePath | 空文字・絶対パス・ルート脱出・バックスラッシュ・許可外ルートを拒否する | UT-TM-009, UT-TM-010, UT-TM-011, UT-TM-012, UT-TM-013, UT-TM-014, UT-TM-015, UT-TM-016, UT-TM-017, UT-TM-018, UT-TM-019, UT-TM-020 | ✅ カバー |
| MetadataTag | タグ種別は4種のみ、value空文字禁止、lineNumberは1以上 | UT-TM-021, UT-TM-022, UT-TM-023, UT-TM-024, UT-TM-025, UT-TM-026, UT-TM-027, UT-TM-028, UT-TM-029, UT-TM-030, IT-TM-030, IT-TM-031, IT-TM-035, IT-TM-036, IT-TM-037, IT-TM-038, IT-TM-039 | ✅ カバー |
| UnitReference | unresolved 時は `constructionRoot=null`、resolved 判定が一貫する | UT-TM-031, UT-TM-032, UT-TM-033, UT-TM-034, UT-TM-035, IT-TM-064, IT-TM-065, IT-TM-066, IT-TM-067, IT-TM-068 | ✅ カバー |
| LayerReference | 正規語彙は `domain/application/infrastructure/presentation` のみ、legacy語彙は無効 | UT-TM-036, UT-TM-037, UT-TM-038, UT-TM-039, UT-TM-040, UT-TM-041 | ✅ カバー |
| StoryReference | StoryId を保持し、resolved 状態で参照整合性を表現する | UT-TM-042, UT-TM-043, UT-TM-044, UT-TM-045, IT-TM-058, IT-TM-060, IT-TM-063 | ✅ カバー |
| StoryIdAnnotation | 行番号は1以上、独立行判定と context 保持が必要 | UT-TM-046, UT-TM-047, UT-TM-048, UT-TM-049, UT-TM-050, IT-TM-040, IT-TM-041, IT-TM-042, IT-TM-043, IT-TM-044, IT-TM-045, IT-TM-046 | ✅ カバー |
| DesignDocumentFlags | `initial_creation` により `@story-id` 必須有無が切り替わる | UT-TM-051, UT-TM-052, UT-TM-053, UT-TM-054, UT-TM-055, UT-TM-056, IT-TM-047, IT-TM-048, IT-TM-049, IT-TM-050, IT-TM-051 | ✅ カバー |
| ChainLink | linkType は正規4値のみ、from/to 必須、broken 判定可能 | UT-TM-057, UT-TM-058, UT-TM-059, UT-TM-060, UT-TM-061 | ✅ カバー |
| TraceabilityChain | origin整合、link順序、完全性判定、broken/resolved 抽出 | UT-TM-062, UT-TM-063, UT-TM-064, UT-TM-065, UT-TM-066, UT-TM-067, UT-TM-068, UT-TM-069, UT-TM-070, IT-TM-100, IT-TM-101, IT-TM-102, IT-TM-103 | ✅ カバー |
| MetadataValidationResult | success/failure の整合、errors/warnings 判定、等価性 | UT-TM-071, UT-TM-072, UT-TM-073, UT-TM-074, UT-TM-075, UT-TM-076, UT-TM-077, UT-TM-078, UT-TM-079 | ✅ カバー |

注: `MetadataValidator`、`StoryIdAliasResolver`、`TraceabilityChainBuilder` のサービス起点ルールは、受け入れ基準と UseCase の両観点で評価した。

## 4. UseCaseカバレッジ詳細

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|----------|--------|--------|-----------|
| ValidateImplementationMetadataUseCase | IT-TM-001, IT-TM-004, IT-TM-005 | IT-TM-002, IT-TM-003 | ✅ カバー |
| ValidateDesignStoryAnnotationsUseCase | IT-TM-006, IT-TM-008, IT-TM-011 | IT-TM-007, IT-TM-009, IT-TM-010 | ✅ カバー |
| ValidateTestStoryMetadataUseCase | IT-TM-012, IT-TM-016 | IT-TM-013, IT-TM-014, IT-TM-015 | ✅ カバー |
| BuildTraceabilityChainUseCase | IT-TM-017, IT-TM-018 | IT-TM-019, IT-TM-020 | ✅ カバー |
| VerifyTraceabilityCoverageUseCase | IT-TM-021, IT-TM-022, IT-TM-023, IT-TM-025, IT-TM-104, IT-TM-106 | IT-TM-024 | ✅ カバー |
| ResolveLegacyStoryIdUseCase | IT-TM-026 | IT-TM-027, IT-TM-028, IT-TM-029 | ✅ カバー |

`VerifyTraceabilityCoverageUseCase` は IT-TM-106 の追加により、`broken link総数` の集計を明示的に assert するケースがカバーされた。

## 5. 未カバー項目一覧

全項目がカバーされた。未カバー項目はなし。

## 6. 前回レポートからの改善点

前回レポート（81%）で指摘された未カバー項目6件は、テスト設計の追補ケースにより全て解消された。

| 前回の未カバー項目 | 対応した追補ケース | 解消状態 |
|-----------------|----------------|---------|
| `@story-id` 欠落時の `fix_example` 検証がない | UT-TM-117 | ✅ 解消 |
| `@story` 欠落時の `fix_example` 検証がない | UT-TM-119 | ✅ 解消 |
| `nyquist-validation` 連携のストーリー-テスト間トレーサビリティ検証がない | IT-TM-105 | ✅ 解消 |
| `@unit` 値不一致時の `L2-002` コード明示検証がない | UT-TM-116 | ✅ 解消 |
| `@story-id` 独立行だが「設計要素の直前」でない場合の異常系がない | UT-TM-118 | ✅ 解消 |
| `VerifyTraceabilityCoverageUseCase` の `broken link総数` 明示検証がない | IT-TM-106 | ✅ 解消 |

## 7. 次のアクション

全観点で100%カバレッジを達成したため、テストロジック設計（実装）に進行可能。
