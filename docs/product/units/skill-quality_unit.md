# Unit定義: skill-quality

@story-id H03-08
設計要素: Phase Gate self-hosting 用の skill-quality Unit definition.

> **Unit ID**: skill-quality
> **作成日**: 2026-03-12
> **Wave**: 3（拡張・運用・保証）
> **対応Epic**: H-12 スキル品質強化

---

## 1. 概要

既存スキル（story-implementor、test-coverage-checker、implementation-readiness-checker）の品質強化と、新規品質メカニズム（Agent-Lesson System、Cascade Updater拡張、SKILL.md構造検証）を提供するUnit。TDDサイクル単位のAtomic Commits、Nyquist Validation統合による要件カバレッジ検証、Plan-Checker Loopによる実装準備度の自動検証・改善ループを実装する。

v0のskill-enhancementを継承・拡張したUnitである。v0ではFresh Context Protocol + Atomic Commits、Nyquist統合、Plan-Checker Loopの3機能に限定されていたが、v1ではAgent-Lesson System（教訓の自動収集・構造化）、Cascade Updater拡張（@story-id HXX-XX自動付与）、SKILL.md構造維持検証を追加し、スキル品質の包括的な保証を実現する。

**重要**: Agent-Lesson System（H12-04）は**lesson artifactの出力**を担当する。出力されたlesson artifactをAGENTS.mdに集約・反映する責務はci-governance Unitが持つ（Cross-Unit Contract）。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H12-01 | story-implementor Atomic Git Commits + TDD品質契約 | Must |
| H12-02 | test-coverage-checker Nyquist Validation統合 | Must |
| H12-03 | implementation-readiness-checker Plan-Checker Loop統合 | Must |
| H12-04 | Agent-Lesson System（lesson artifact出力） | Must |
| H12-05 | Cascade Updater拡張（Level 3完了後の累積更新 + @story-id HXX-XX自動付与） | Must |
| H12-06 | スキルSKILL.md構造維持検証 | Must |

---

## 3. 機能要件

### 3.1 story-implementor Atomic Git Commits + TDD品質契約（H12-01）

- TDDサイクルのGreen到達時（テスト通過時）にAtomic commitを自動生成
- Refactor完了時にAtomic commitを自動生成
- コミットメッセージに`feat({unit}/{HXX-XX}):`プレフィックスを付与
- TDD品質契約（Red→Green→Refactorの各ステップでの品質チェック）をSKILL.mdに定義
- Atomic commit前にL1+L2バリデータの通過を保証

### 3.2 test-coverage-checker Nyquist Validation統合（H12-02）

- test-coverage-checkerがrequirement-test-matrix.jsonを生成または更新
- 要件→テスト方向のトレーサビリティ検証（全ACにテストが紐づいているか）
- テスト→要件方向のトレーサビリティ検証（全テストがACに紐づいているか）
- coverage_report.mdに要件カバレッジ（AC網羅率）を含める

### 3.3 implementation-readiness-checker Plan-Checker Loop統合（H12-03）

- 最大3回の検証→修正ループ（Plan-Checker Loop）の実行
- 各ループでNyquist coverageRate（AC網羅率）を検証
- coverageRateが閾値未満の場合、不足箇所を指摘して修正を促す
- 3回のループで閾値未達成時、人間へのエスカレーション
- ループの実行履歴をログとして記録

### 3.4 Agent-Lesson System（H12-04）

- `[Agent-Lesson]`タグ付きの教訓をソースコード・コミットメッセージ・設計文書から収集
- 収集された教訓を構造化されたlesson artifactとして出力（JSON形式）
- 重複する教訓の検出・統合
- **注意**: AGENTS.mdへの直接書き込みは行わない。lesson artifactの出力のみが本Unitの責務。ci-governanceがlesson artifactを消費してAGENTS.mdに集約反映する
- **AC分割**: H12-04のAC-2（AGENTS.mdへの集約・反映）はci-governance Unit（H13-03）で充足される。本Unitの責務はlesson artifactの生成・出力までに限定

### 3.5 Cascade Updater拡張（H12-05）

- Level 3（ストーリー実装）完了後に`product/construction/{unit}/`配下のドキュメントを累積更新
- 累積更新箇所に@story-id HXX-XXアノテーションを自動付与
- 実行結果に更新されたファイル・セクション・付与されたストーリーIDの一覧を含める

### 3.6 スキルSKILL.md構造維持検証（H12-06）

- SKILL.mdの必須構造（フロントマター/目的/入力/出力/前提条件/実行フロー）の定義
- v0既存スキルのSKILL.mdが必須構造を満たしていることを検証
- v1新規スキルのSKILL.mdが必須構造を満たしていることを検証
- 構造違反時のエラーメッセージに不足セクション名と期待される構造を含める

---

## 4. ドメインモデル概要

- **AtomicCommitService（ドメインサービス）**: TDDサイクル（Green/Refactor）単位のcommit生成・L1+L2事前検証を統括。commitはライフサイクルを持たずステートレスなため集約から降格（domain_model.md §2 設計決定D1参照）
- **CommitMessage（値オブジェクト）**: `feat({unit}/{HXX-XX}): {description}` 形式のメッセージ構造
- **TddCycle（値オブジェクト）**: Red→Green→Refactorの各ステップの状態と品質チェック結果
- **CoverageReport（値オブジェクト）**: 要件カバレッジ（AC網羅率）+ コードカバレッジの統合結果
- **PlanCheckerLoop（集約ルート）**: 最大3回の検証→修正ループを統括
  - `maxRetries`: 最大ループ回数（3）
  - `currentRetry`: 現在のループ回数
  - `coverageThreshold`: 閾値
  - `loopHistory`: ループ実行履歴
- **LessonArtifact（集約ルート）**: 教訓の収集・構造化・重複検出を統括
  - `lessonId`: 教訓固有ID
  - `source`: 収集元（source_code / commit_message / design_doc）
  - `content`: 教訓内容
  - `tags`: 分類タグ
- **LessonCollector（ドメインサービス）**: `[Agent-Lesson]`タグの検索・収集ロジック
- **LessonDeduplicator（ドメインサービス）**: 重複教訓の検出・統合ロジック
- **CascadeUpdate（集約ルート）**: 累積更新の対象特定・@story-id HXX-XX付与を統括
  - `targetFiles`: 更新対象ファイル一覧
  - `annotations`: 付与した@story-idアノテーション一覧
- **SkillStructure（値オブジェクト）**: SKILL.mdの必須構造定義（必須セクション一覧）
- **SkillValidationResult（値オブジェクト）**: SKILL.md検証結果（合格/不合格 + 不足セクション一覧）
- **SkillStructureValidator（ドメインサービス）**: SKILL.mdの構造検証ロジック

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: Atomic commit前のバリデータエラー出力、SKILL.md構造違反時のエラー出力
- **HarnessConfigV2型**（config-foundationが定義）: coverageRate閾値、agentLessonCollection有効/無効の読み取り

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **RequirementTestMatrix Schema** | 消費 | nyquist-validation | requirement-test-matrix.jsonのJSONスキーマ。test-coverage-checkerが生成/更新 |
| **LessonArtifact Schema** | 消費 | ci-governance | lesson artifactのJSON出力フォーマット。ci-governanceが定義するスキーマに準拠してartifactを出力 |
| **Validator ID Registry** | 消費 | validator-system | Atomic commit前のL1+L2バリデータ実行 |
| **@unit/@layerメタデータ仕様** | 消費 | traceability-model | @story-id HXX-XX自動付与のアノテーション仕様 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K4 | テスト品質ルール | TDD品質契約（Red→Green→Refactorの各ステップでの品質チェック）をstory-implementorのSKILL.mdに定義し、Atomic commit前にL1+L2バリデータの通過を保証 |
| K5 | DDD設計スキル群 | story-implementor、test-coverage-checker、implementation-readiness-checkerの品質強化。SKILL.md構造維持検証（H12-06）によりスキル群の構造的一貫性を保証 |
| K6 | 2-Phase Execution | story-implementorのAtomic Commits強化においても2-Phase Executionの設計→実装順序を維持 |
| K8 | Cascade Updater | Level 3完了後の累積更新対応と@story-id HXX-XXアノテーション自動付与により、設計⇔実装の一貫性を自動維持 |
| K9 | Agent-Lesson System | `[Agent-Lesson]`タグによる教訓収集・構造化・重複検出。lesson artifact出力による蓄積基盤の提供。AGENTS.mdへの集約はci-governance（H13-03）が担当 |
| K3.5 | @unit/@layer/@story-idメタデータ | Cascade Updaterの@story-id HXX-XX自動付与により、設計文書のトレーサビリティを自動的に維持 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| スキル | story-implementor（Atomic Commits + TDD品質契約強化版） | 外部利用者（オーケストレーター経由） |
| スキル | test-coverage-checker（Nyquist統合版） | 外部利用者（オーケストレーター経由） |
| スキル | implementation-readiness-checker（Plan-Checker Loop版） | 外部利用者（オーケストレーター経由） |
| データ | LessonArtifact（lesson artifact出力） | ci-governance（AGENTS.md集約） |
| データ | CoverageReport（要件カバレッジ + コードカバレッジ統合結果） | nyquist-validation（カバレッジ統合） |
| モジュール | SkillStructureValidator（SKILL.md構造検証） | ci-governance（CIゲート組み込み） |
| モジュール | CascadeUpdateService（累積更新 + @story-id HXX-XX付与） | 外部利用者（オーケストレーター経由） |

---

## 8. 実装上の制約・注意事項

- **Atomic commit前のバリデータ実行**: Green/Refactor到達時のAtomic commit生成前に、validator-systemのL1+L2バリデータを実行する。バリデータ実行はvalidator-systemのValidatorRegistryインターフェースを通じて行い、本Unit内にバリデータ実行ロジックを持たない
- **lesson artifactのスキーマ準拠**: lesson artifactはci-governanceが定義するLessonArtifact Schemaに準拠したJSON形式で出力する。AGENTS.mdへの直接書き込みは行わない。これはCross-Unit Contractで合意された責務分離であり、AGENTS.mdの構造的一貫性をci-governanceが一元管理するための設計判断である
- **Plan-Checker Loopのエスカレーション**: 3回のループで閾値未達成時はHarnessErrorではなくエスカレーション通知（人間への警告メッセージ）を出力する。自動修正ではなく人間の判断を促す設計
- **SKILL.md必須構造の定義**: 必須セクション（フロントマター/目的/入力/出力/前提条件/実行フロー）は本Unitのドメイン層で値オブジェクトとして定義する。将来のセクション追加はSkillStructure値オブジェクトの拡張で対応
- **Cascade Updater の@story-id付与ルール**: traceability-modelが定義するメタデータ仕様に厳密に準拠する。@story-id HXX-XXは設計要素の直前に独立行として記載（インラインではなくブロック単位）。初回のUnit横断設計（Level 2）で作成された内容にはstory-id注釈は不要
- **Nyquist統合のデータフロー**: test-coverage-checkerはnyquist-validationが定義するRequirementTestMatrix Schemaに準拠してrequirement-test-matrix.jsonを生成/更新する。AC網羅率の算出ロジックはnyquist-validation側から提供されるインターフェースを利用する
- **テスト戦略**: 各機能（Atomic Commits、Nyquist統合、Plan-Checker Loop、Agent-Lesson、Cascade Updater、SKILL.md検証）ごとにテストスイートを分離し、独立して実行可能にする。ドメイン層テストではモック禁止（testing-rules.md準拠）

---

## 9. Corpus 履歴

- 2026-04-25: Phase Gate self-hosting の kebab-case path 解決用 entry を追加した。
- 2026-07-16: WI-285 で詳細定義を canonical path へ統合し、単一正本化した。
