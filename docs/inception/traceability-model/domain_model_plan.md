# ドメインモデル設計計画: traceability-model

## 1. スコープ

- **対象Unit**: traceability-model（H-03 Traceability Model）
- **担当ストーリー**: H03-01（@unit/@layerメタデータ体系）, H03-02（@story-idメタデータ）, H03-03（@storyメタデータ+逆引きチェーン全体検証）
- **他Unitとの境界**:
  - biome-ast-engine: @unit/@layerのL1存在チェックを消費（本UnitはL2整合性検証）
  - validator-system: MetadataValidatorインターフェースを提供
  - nyquist-validation: @storyメタデータ仕様とStoryId値オブジェクトを提供
  - skill-quality: @story-idアノテーション仕様をCascade Updaterに提供
  - harness-error: L2-002エラーのフォーマット

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類 |
|------|-------------|------|
| TraceabilityChain | H03-03 | 値オブジェクト（ファイル起点の不変逆引きチェーン） |
| MetadataTag | H03-01 | 値オブジェクト（@unit/@layer/@story-id/@storyタグ） |
| StoryId | H03-01, H03-02, H03-03 | 値オブジェクト — **Shared Kernel**（HXX-XX形式のv1ストーリーID） |
| UnitReference | H03-01 | 値オブジェクト（@unit値とunit定義の参照） |
| LayerReference | H03-01 | 値オブジェクト（@layer値、横断契約§2の正規語彙に準拠） |
| StoryReference | H03-03 | 値オブジェクト（@story値とuser_stories.mdの参照） |
| StoryIdAnnotation | H03-02 | 値オブジェクト（設計文書の@story-id HXX-XXアノテーション） |
| ChainLink | H03-03 | 値オブジェクト（チェーンの各リンク） |
| MetadataValidationResult | H03-01 | 値オブジェクト（バリデーション結果） |

### 集約・サービスの構成

**集約なし** — traceability-modelは検証スナップショットを扱うため、集約よりドメインサービス+値オブジェクトが自然。

- **MetadataValidator**（ドメインサービス）: ファイル横断でメタデータの整合性を検証。L2では「直接リンクの整合性」のみ検証し、全チェーンの網羅的健全性検証はL4 drift-detectに委任
- **StoryIdAliasResolver**（ドメインサービス）: v0 US-XXX → v1 HXX-XX の別名解決。StoryId値オブジェクト本体から分離。StoryCatalogPort経由でマッピングを取得（user_stories.mdの解析はInfrastructure層アダプターが担当）
- **TraceabilityChainBuilder**（ドメインサービス）: FilePath起点で逆引きチェーン（実装→@unit→construction文書→@story-id→inception文書）を構築し、TraceabilityChain値オブジェクトを返す

### v0からの変更点（新規Unit）

- v0の@unit/@layerメタデータ仕様を拡張し、逆引きチェーン全体をモデル化
- TraceabilityChain集約候補 → 値オブジェクトに降格（検証スナップショットであり所有権境界がない）
- StoryIdのv0マッピング → StoryIdAliasResolverサービスに分離（StoryId値オブジェクトの責務過多を回避）

## 3. 設計方針

- **集約なし**: 検証スナップショットを扱うドメインのため、TraceabilityChainは値オブジェクト、検証はドメインサービスが担当
- **メタデータ仕様の所有権**: 本Unitがメタデータ仕様の正規定義を所有。biome-ast-engine（L1）は存在チェックのみ、本Unit（L2）は整合性検証を担当
- **StoryId体系**: v1のHXX-XX形式を正規ID（横断契約§1）。v0 US-XXXとのマッピングはStoryIdAliasResolverで管理
- **LayerReference語彙**: 横断契約§2で固定されたv1正規語彙（domain/application/infrastructure/presentation）に準拠。biome-ast-engineのLayerBoundaryと同一語彙表を参照
- **L2/L4責務分離**: L2 metadataは「直接リンクの整合性」（@unit→unit定義の存在、@layer→有効レイヤー名、@story-id→ストーリー存在）。L4 drift-detectは「全チェーンの網羅的健全性」
- **Shared Kernelとの関係**: StoryIdをShared Kernelとして提供。HarnessError型を消費

## 4. QA（不明点・確認事項）

### [Question] Q1: TraceabilityChainの集約境界 — ファイル単位 vs Unit単位

逆引きチェーンをファイル単位（1実装ファイル=1チェーン）とUnit単位（1 Unit=1チェーン集合）のどちらで集約するか？

**決定**: ファイル単位の不変TraceabilityChain値オブジェクト。集約ではなく値オブジェクトとして扱う。全体検証はMetadataValidator/TraceabilityChainBuilderの責務。

[Answer] codexレビュー合意: 集約ではなくファイル起点の不変チェーン値オブジェクトが適切。

### [Question] Q2: @story-idの初回判定方式

設計文書の累積更新時のみ@story-idを要求するが、「初回作成」の判定方法は？

**決定**: 設計文書のフロントマターに`level: 2`等の明示フラグを使用。git依存を避けつつ、「@story-idが0個=初回」の誤判定（付与漏れをfalse negative）を防止。

[Answer] codexレビュー合意: C案（@story-id 0個=初回）は付与漏れを初回と誤認するリスクあり。フロントマターの明示フラグで補完。

### [Question] Q3: StoryIdのv0マッピングテーブル管理

v0 US-XXX → v1 HXX-XX のマッピングテーブルをどこに配置するか？

**決定**: StoryIdAliasResolverサービスに分離。user_stories.mdの`旧US`フィールドから起動時にマッピングを構築。StoryId値オブジェクト内部には持たせない。

[Answer] codexレビュー合意: ID値と旧ID別名解決は分けるべき。StoryId値オブジェクトの責務過多を回避。

## 5. 前提条件・リスク

- **user_stories.md解析**: ストーリーID一覧をuser_stories.mdからパースする必要がある。フォーマット変更時の追従リスク
- **パフォーマンス**: pre-commit時のメタデータ検証は高速である必要がある（変更ファイルのみ検証）
- **L2/L4責務重複**: 逆引きチェーンの深さに注意。L2は直接リンクのみ、全チェーンはL4に委任
- **Story ID正規化**: HXX-XX形式への統一が前提（横断契約§1）
