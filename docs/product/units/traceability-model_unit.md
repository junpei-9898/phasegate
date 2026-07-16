---
traceability:
  initial_creation: true
---

# Unit定義: traceability-model

@story-id H03-01

> **Unit ID**: traceability-model
> **作成日**: 2026-03-12
> **Wave**: 1（基盤構築）
> **対応Epic**: H-03 Traceability Model

---

## 1. 概要

traceability-modelは、Phasegateにおける実装コード・設計文書・テストのトレーサビリティ基盤を担うUnit。実装ファイルに`@unit`/`@layer`メタデータを必須化し、設計文書に`@story-id`アノテーション（例: `@story-id H03-01`）を強制し、テストファイルに`@story`メタデータを必須化することで、任意の実装ファイルから設計意図・USの意思決定根拠まで決定論的に辿れる逆引きチェーンを構築する。

**ストーリーID体系**: v1では`HXX-XX`形式（例: H01-01, H03-02）を正規IDとする。v0の`US-XXX`形式は`旧US`として参照のみ保持する。メタデータアノテーション・フォルダ構造・RequirementTestMatrix全てで`HXX-XX`形式に統一する。

L2 metadataバリデータにより、メタデータの存在チェック（L1で実施）に加えて、Unit名整合（@unitの値がunit定義に存在するか）、Layer名整合（@layerの値が有効なレイヤー名か）、Story-ID整合（`@story-id HXX-XX`がuser_stories.mdのストーリーIDに存在するか）、逆引きチェーン全体の連結性を検証する。v1で新規追加されたK3.5の体系化を担う。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H03-01 | @unit/@layerメタデータ体系 + L2 metadataバリデータ基本実装 | Must |
| H03-02 | @US-XXXメタデータ + 設計文書累積更新時の付与検証 | Must |
| H03-03 | @storyメタデータ + 逆引きチェーン全体検証 | Must |

---

## 3. 機能要件

### 3.1 @unit/@layerメタデータ体系 + L2 metadataバリデータ（H03-01）

- 実装ファイルに`// @unit {unit_name}`コメントを必須化する（L1 require-unit-commentで存在チェック済み。本Unitはその上位であるL2での整合性検証を担当）
- 実装ファイルに`// @layer {layer_name}`コメントを必須化する（L1 require-layer-commentで存在チェック済み）
- L2 metadataバリデータが`@unit`値と`product/units/{unit_name}_unit.md`の定義名の一致を検証する
- L2 metadataバリデータが`@layer`値が有効なレイヤー名（domain/application/infrastructure/presentation）であることを検証する
- Unit名不一致・Layer名不正の場合、HarnessError（L2-002）を出力する

### 3.2 @story-idメタデータ + 設計文書累積更新時の付与検証（H03-02）

- `product/construction/{unit}/`配下のドキュメント更新時、更新箇所に`@story-id HXX-XX`（例: `@story-id H03-02`）が付与されていることをL2 metadataバリデータが検証する
- `@story-id`が参照するストーリーIDが`product/user_stories.md`のv1 ID体系（`HXX-XX`形式）に存在することを検証する
- 初回のUnit横断設計（Level 2）で作成された内容にはストーリーID注釈不要であることをバリデータが許容する
- `@story-id HXX-XX`は設計要素の直前に独立行として記載されることを検証する
- @story-id欠落時のHarnessError（L2-002拡張）にfix_exampleを含める

### 3.3 @storyメタデータ + 逆引きチェーン全体検証（H03-03）

- テストファイルに`// @story HXX-XX`コメント（例: `// @story H03-03`）を必須化し、L2 metadataバリデータで検証する
- `@story`が参照するストーリーIDが`product/user_stories.md`のv1 ID体系（`HXX-XX`形式）に存在することを検証する
- 逆引きチェーン（実装→@unit→product/construction/{unit}/→@story-id HXX-XX→inception/{unit}/{HXX-XX}/）の各リンクが存在することを検証するテストを用意する
- L3 nyquistバリデータが`@story`メタデータを入力としてストーリー-テスト間のトレーサビリティを検証する（nyquist-validationとの連携点）
- @story欠落時のHarnessError（L2-002拡張）にfix_exampleを含める

---

## 4. ドメインモデル概要

- **MetadataTag（値オブジェクト）**: @unit/@layer/@story-id/@storyの各メタデータタグ。タグ種別・値・ソースファイル位置を保持
- **StoryId（値オブジェクト）**: v1ストーリーID（`HXX-XX`形式、例: H01-01）。v0 `US-XXX` IDとのマッピングテーブルを保持（後方参照用）
- **UnitReference（値オブジェクト）**: @unitタグの値とunit定義ファイルへの参照を表現
- **LayerReference（値オブジェクト）**: @layerタグの値。有効なレイヤー名（domain/application/infrastructure/presentation）の列挙
- **StoryReference（値オブジェクト）**: @storyタグの値とuser_stories.md内のストーリーID（`HXX-XX`形式）への参照を表現
- **StoryIdAnnotation（値オブジェクト）**: @story-id HXX-XXアノテーション。設計要素の直前に独立行として存在することを制約
- **TraceabilityChain（集約）**: 逆引きチェーン全体を表現。実装ファイル→@unit→construction文書→@story-id HXX-XX→inception文書の各リンクの存在を管理
- **MetadataValidator（ドメインサービス）**: L2 metadataバリデータのコアロジック。Unit名整合・Layer名整合・StoryID整合（`HXX-XX`形式検証）・チェーン連結性を検証
- **MetadataValidationResult（値オブジェクト）**: バリデーション結果。通過/失敗 + 失敗詳細（HarnessError[]）

> 詳細なドメインモデル設計はdomain-designerスキルで定義する。

---

## 5. 外部依存

### 5.1 Shared Kernel参照

| 参照元 | 内容 |
|--------|------|
| `HarnessError` 型（harness-error） | L2-002（メタデータ不整合）エラーの出力フォーマット。fix_exampleを含む |
| `@unit/@layer` メタデータ仕様 | 本Unitが定義元。メタデータの形式・配置ルール・有効値の仕様を全Unitに提供 |

### 5.2 Cross-Unit Contract

| 契約 | 方向 | 相手Unit | 内容 |
|------|------|---------|------|
| @unit/@layerメタデータ仕様 | 提供 | biome-ast-engine | L1 require-unit-comment / require-layer-commentルールが参照するメタデータの形式仕様 |
| @unit/@layerメタデータ仕様 | 提供 | validator-system | L2 metadataバリデータが使用するメタデータの有効値定義 |
| @storyメタデータ仕様 | 提供 | nyquist-validation | @story HXX-XXメタデータを入力としてストーリー-テスト間トレーサビリティを検証 |
| @story-idアノテーション仕様 | 提供 | skill-quality (Cascade Updater) | 累積更新時の@story-id HXX-XX自動付与に使用するアノテーション形式 |
| StoryId値オブジェクト（HXX-XX形式） | 提供 | nyquist-validation, validator-system | v1ストーリーID体系の正規定義。v0 US-XXXとのマッピングテーブル含む |
| Unit定義ファイル一覧 | 消費 | config-foundation / 本Unit自身 | @unit値の検証に`product/units/{unit_name}_unit.md`の存在を参照 |
| user_stories.md | 消費 | 外部文書 | @story-id / @storyの値が有効なストーリーID（`HXX-XX`形式）であることの検証に使用 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|----------------|
| K3.5 | @unit/@layer/@story-idメタデータ | 本Unitの中核責務。実装ファイルに@unit/@layer、設計文書に@story-id HXX-XX、テストに@story HXX-XXを強制する体系を定義し、L2 metadataバリデータで整合性を検証する。v1ストーリーID体系（`HXX-XX`形式）の正規定義を本Unitが所有する |
| K1 | 4層防御モデル（L1-L4） | L2レイヤーのmetadataバリデータを本Unitが担当。L1（存在チェック）はbiome-ast-engineが実施し、本Unitは上位のL2（整合性チェック）を提供する |
| K11 | Drift Detection | 逆引きチェーン検証により、実装→設計間のリンク断絶を検出する基盤を提供。L4 drift-detectバリデータの入力となる |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit | 内容 |
|------|------|---------|------|
| メタデータ仕様 | @unit/@layer形式定義 | biome-ast-engine, validator-system | メタデータの形式（コメント構文）・有効値・配置ルール |
| メタデータ仕様 | @story-id HXX-XX形式定義 | skill-quality (Cascade Updater) | 設計文書アノテーションの形式・配置ルール |
| メタデータ仕様 | @story HXX-XX形式定義 | nyquist-validation | テストファイルメタデータの形式・有効値 |
| 値オブジェクト | StoryId（HXX-XX形式 + v0マッピング） | nyquist-validation, validator-system | v1ストーリーID体系の正規定義 |
| バリデーション | MetadataValidator | validator-system | L2 metadataバリデータのインターフェース（Unit名整合・Layer名整合・US-ID整合・チェーン連結性） |
| ドメインモデル | TraceabilityChain | validator-system (L4 drift-detect) | 逆引きチェーンのリンク存在検証インターフェース |

---

## 8. 実装上の制約・注意事項

- **L1とL2の責務分離**: @unit/@layerの存在チェック（L1）はbiome-ast-engineが担当する。本UnitはL2として整合性検証（値の妥当性、参照先の存在）を担当する。二重検証にならないよう責務を明確に分離する
- **初回設計とストーリーID注釈**: Level 2（Unit横断設計）の初回作成時にはストーリーID注釈（@story-id）は不要。累積更新時のみ付与を要求する。この区別はファイルのgit履歴またはフロントマターから判定する
- **逆引きチェーンの完全性**: 実装→@unit→construction文書→@story-id HXX-XX→inception文書の5段階リンクの全てが存在しなければチェーン検証は失敗とする。部分的な存在は許容しない
- **fix_exampleの品質**: @unit/@layer/@story-id/@story欠落時のHarnessErrorには、正確なfix_example（修正コード例）を含める。fix_exampleはテスト資産として管理する（harness-error Unitとの連携）
- **パフォーマンス考慮**: user_stories.mdの全ストーリーID一覧は起動時にキャッシュし、ファイル変更監視で更新する。毎回のパースを避ける
- **メタデータ形式の厳密性**: `// @unit unit-name`の形式は半角スペース1つで区切り、unit-nameにはハイフン区切りの英小文字のみを許容する。`// @layer domain`も同様
- **v0→v1 ID体系移行**: v0の`US-XXX`形式IDは`旧US`フィールドとして参照保持するが、メタデータアノテーション・フォルダパス・RequirementTestMatrixの全てで`HXX-XX`形式を正規IDとして使用する
