# ドメインモデル設計計画: skill-quality

> **作成日**: 2026-03-19
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: skill-quality（H-12 スキル品質強化）
> **担当ストーリー**: H12-01〜H12-06

---

## 1. スコープ

- **対象Unit**: skill-quality
- **担当ストーリー**:
  - H12-01: story-implementor Atomic Git Commits + TDD品質契約
  - H12-02: test-coverage-checker Nyquist Validation統合
  - H12-03: implementation-readiness-checker Plan-Checker Loop統合
  - H12-04: Agent-Lesson System（lesson artifact出力）
  - H12-05: Cascade Updater拡張（Level 3完了後累積更新 + @story-id HXX-XX自動付与）
  - H12-06: スキルSKILL.md構造維持検証
- **他Unitとの境界**:
  - harness-error: HarnessError型をエラー表現に使用（Shared Kernel）
  - config-foundation: HarnessConfigV2からUnit設定・閾値を参照（Shared Kernel）
  - nyquist-validation: RequirementTestMatrix Schemaを消費（Cross-Unit Contract）
  - ci-governance: LessonArtifact Schemaを消費（Cross-Unit Contract）—本Unitはスキーマ所有者ではなく準拠者
  - validator-system: Validator ID Registryを消費（Cross-Unit Contract）

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| AtomicCommit | H12-01 | ※集約評価対象（後述） |
| CommitMessage | H12-01 | 値オブジェクト（`feat({unit}/{HXX-XX}): {description}` 形式） |
| TddCycle | H12-01 | 値オブジェクト（Red→Green→Refactorの各ステップ状態） |
| CoverageReport | H12-02 | 値オブジェクト（要件カバレッジ + コードカバレッジ統合結果） |
| PlanCheckerLoop | H12-03 | ※集約評価対象（後述） |
| LessonArtifact | H12-04 | ※集約評価対象（後述） |
| CascadeUpdate | H12-05 | ※集約評価対象（後述） |
| SkillStructure | H12-06 | 値オブジェクト（SKILL.mdの必須構造定義） |
| SkillValidationResult | H12-06 | 値オブジェクト（SKILL.md検証結果） |
| LessonCollector | H12-04 | ドメインサービス（[Agent-Lesson]タグ検索・収集） |
| LessonDeduplicator | H12-04 | ドメインサービス（重複教訓の検出・統合） |
| SkillStructureValidator | H12-06 | ドメインサービス（SKILL.md構造検証） |
| CascadeUpdateService | H12-05 | ドメインサービス（累積更新ロジック） |

---

### 集約候補1: AtomicCommitの評価

Unit定義§4では `AtomicCommit` を**集約ルート候補**として記載している。横断契約§6の集約降格方針に照らして検討する。

**集約ルートとして維持したい根拠**:
- TDDサイクル1回分のコミット操作（L1+L2事前検証 → commit作成）という一連の操作をカプセル化する
- `TddCycle`（Red→Green→Refactor状態）と`CommitMessage`（形式検証済みの文字列VO）を内包する構造として見ると、集約としての「整合性責務」があるように見える

**集約ルートに降格する根拠（ドメインサービス化を推奨）**:
- commitというI/O操作（実際のgit commit実行）はinfrastructure層が担う。ドメイン層で保持すべき「状態」はない
- L1+L2事前検証もそれぞれのユニット（biome-ast-engine等）への委譲であり、AtomicCommit自身は「検証済みのCommitMessage + TddCycle状態」を取りまとめるだけ
- ライフサイクルが存在しない: commitは作成されると即座に完了であり、「進行中のAtomicCommit」という概念はセッション内一時データに過ぎない
- 永続化不要: commitメッセージの形式検証結果・TDDサイクル状態はcommit実行後に破棄される

**結論**: AtomicCommitは集約ルートから**ドメインサービス（AtomicCommitService）に降格**。CommitMessageとTddCycleはVOとして維持。AtomicCommitServiceが「CommitMessage生成 → 事前検証 → CommitReadiness判定」を担い、実際のgit操作はGitPortに委譲する。

---

### 集約候補2: PlanCheckerLoopの評価

Unit定義§4では `PlanCheckerLoop` を**集約ルート候補**として記載し、「最大3回の検証→修正ループ」を統括するとしている。

**エンティティ（集約ルート）として維持する根拠**:
- ループ回数（現在の試行回数: 0〜3）という**明確な状態**を持つ。現在何回目の検証かによって動作が分岐する
- 「前回の検証結果を踏まえた次回の修正指示」という連続性があり、単一の変換操作では表現できない
- 最大3回という制約の強制（3回超過でエラー）はPlanCheckerLoop自身が担うビジネスルール

**集約ルートにしない根拠（エンティティとして独立）を検討したが**:
- 複数の`PlanCheckAttempt`（各試行の記録）を内包し、最新の検証結果との整合性管理が必要
- セッション内一時データではあるが、ループを制御するための「整合性ある複数エンティティの管理」が存在する

**結論**: PlanCheckerLoopはエンティティとして採用し、**集約ルート**とする。`PlanCheckAttempt`（各試行のVO: 試行番号 + 検証結果 + 修正指示）を集約内に持つ。ループ完了後の永続化は不要（セッション内データ）だが、整合性責務の観点から集約構造が適切。

---

### 集約候補3: LessonArtifactの評価

Unit定義§4では `LessonArtifact` を**集約ルート候補**として記載している。

**集約ルートとして維持する根拠**:
- lesson artifactはJSONファイルとして出力される**明確なI/O境界**がある
- 複数のLesson（各教訓エントリ）を収集・重複排除した上でartifactを構成するという**整合性責務**がある
- 「重複なしの有効な教訓コレクション」という不変条件の強制が必要

**スキーマ所有権の明確化**:
- LessonArtifact Schemaはci-governanceが所有する。本Unitは当該スキーマに**準拠して出力するだけ**
- ドメイン層のLessonArtifactはci-governance定義のスキーマと対応した構造を持つが、スキーマ定義自体は持たない
- スキーマ準拠検証はLessonArtifactSchemaPortを通じて委譲する

**結論**: LessonArtifactは集約ルートとして採用。`Lesson`（個々の教訓エントリ: [Agent-Lesson]タグ付きの学習内容VO）を複数内包する。LessonCollector・LessonDeduplicatorはドメインサービスとして独立させ、構築済みLessonArtifactに対して操作する設計とする。

---

### 集約候補4: CascadeUpdateの評価

Unit定義§4では `CascadeUpdate` を**集約ルート候補**として記載し、「累積更新の対象特定・@story-id HXX-XX付与」を統括するとしている。

**集約ルートとして維持したい根拠**:
- 「何を更新したか」の記録（更新対象ファイル・付与したstory-id・更新前後の差分）は追跡可能性の観点で重要

**ドメインサービスへ降格する根拠**:
- CascadeUpdate自体のライフサイクルが不明確: Level 3完了後に実行され完了すれば終わり
- 「更新記録」はci-governanceの責務であり、本Unitは「@story-id HXX-XXを付与して関連ファイルを更新する操作」の実行に過ぎない
- 永続化が必要な状態は「どのファイルを更新したか」のみであり、これは更新実行の副作用（ファイルシステムへの書き込み）として表現される
- 更新対象特定ロジックはステートレスな計算（設定ファイル + ストーリーIDを入力してターゲットファイル一覧を出力）

**結論**: CascadeUpdateは集約ルートから**ドメインサービス（CascadeUpdateService）に降格**。`CascadeUpdateTarget`（更新対象ファイルパス + 付与するstory-id タグのVO）と`CascadeUpdateResult`（更新結果のVO）を値オブジェクトとして定義する。実際のファイル操作はFileSystemPortに委譲。

---

### 全体構成の結論: 集約1つ + エンティティなし

| 構造 | 採用理由 |
|------|---------|
| PlanCheckerLoop（集約ルート） | ループ回数状態 + 試行記録の整合性管理が必要 |
| LessonArtifact（集約ルート） | I/O境界（JSONファイル出力） + 重複なし不変条件 |
| 残りは全てVO / ドメインサービス | ステートレス計算 / インフラ委譲 / ライフサイクルなし |

---

## 3. 設計方針

### 3.1 ストーリー別のドメイン構造

```
[H12-01: Atomic Git Commits + TDD品質契約]
  AtomicCommitService（ドメインサービス）
  ├── TddCycle（VO: Red→Green→Refactor 状態）
  ├── CommitMessage（VO: "feat({unit}/{HXX-XX}): {description}" 形式検証済み）
  ├── CommitReadiness（VO: L1+L2事前検証結果 + go/no-go判定）
  └── GitPort（ポート: 実際のgit commit実行委譲）

[H12-02: Nyquist Validation統合]
  CoverageReport（VO）
  ├── requirementCoverage: RequirementCoverageResult（VO）
  └── codeCoverage: CodeCoverageResult（VO）
  RequirementTestMatrixPort（ポート: nyquist-validation のMatrixを消費）

[H12-03: Plan-Checker Loop統合]
  PlanCheckerLoop（集約ルート）
  ├── attempts: PlanCheckAttempt[]（各試行のVO）
  ├── maxAttempts: number（不変: 3）
  └── currentStatus: LoopStatus（RUNNING | PASSED | FAILED_EXCEEDED）

[H12-04: Agent-Lesson System]
  LessonArtifact（集約ルート）
  ├── lessons: Lesson[]（重複なし）
  └── storyId: StoryId（紐付くストーリーID）
  LessonCollector（ドメインサービス: [Agent-Lesson]タグ収集）
  LessonDeduplicator（ドメインサービス: 重複検出・統合）
  LessonArtifactSchemaPort（ポート: ci-governance定義スキーマへの準拠検証委譲）

[H12-05: Cascade Updater拡張]
  CascadeUpdateService（ドメインサービス）
  ├── CascadeUpdateTarget（VO: 更新対象ファイルパス + story-id タグ）
  └── CascadeUpdateResult（VO: 更新ファイル数 + 付与したstory-id一覧）
  FileSystemPort（ポート: ファイル読み書き委譲）

[H12-06: SKILL.md構造維持検証]
  SkillStructure（VO: 必須セクション一覧 + セクション順序定義）
  SkillValidationResult（VO: 検証結果 + 違反箇所一覧）
  SkillStructureValidator（ドメインサービス: SKILL.md構造検証）
  SkillFileReaderPort（ポート: SKILL.mdファイル読み込み委譲）
```

### 3.2 PlanCheckerLoopの状態遷移

```
[初期状態: RUNNING / attempts=0]
    ↓ 検証実行
PlanCheckAttempt追加（試行番号 + 検証結果 + 修正指示）
[RUNNING / attempts=1]
    ↓ 検証パス
PASSED（成功終了）
or
    ↓ 検証失敗 × 3回
FAILED_EXCEEDED（最大試行超過エラー）
```

不変条件: `attempts.length <= maxAttempts (3)` かつ `status=PASSED` になれるのは検証結果が合格の場合のみ。

### 3.3 LessonArtifactの構造

```
LessonArtifact {
  storyId: StoryId                   // 紐付くストーリーID（例: "H12-04"）
  lessons: Lesson[]                  // 重複なし（LessonDeduplicatorが保証）
  createdAt: ISODateString           // 作成日時（VO）
}

Lesson {
  tag: '[Agent-Lesson]'              // 固定プレフィックス
  content: string                    // 教訓本文
  sourceContext: SourceContext       // 発生元（ファイルパス or エージェント発言コンテキスト）
  fingerprint: LessonFingerprint     // 重複検出用ハッシュ（content正規化後）
}
```

LessonArtifactSchemaPortを通じてci-governance定義スキーマへの準拠を検証し、CI-governance側のスキーマ変更に対してドメイン層の変更を最小化する。

### 3.4 CommitMessageの形式ルール

```
CommitMessage {
  unit: UnitName                     // 例: "skill-quality"
  storyId: StoryId                   // 例: "H12-01"
  description: string                // 説明（非空）

  format(): string                   // "feat({unit}/{storyId}): {description}"
}
```

不変条件: `unit`・`storyId`・`description` はいずれも非空文字列。`format()` の結果が Conventional Commits 形式に準拠すること。

### 3.5 CoverageReportのスキーマ消費設計

RequirementTestMatrixはnyquist-validationが所有するため、本Unitはスキーマ定義を持たず`RequirementTestMatrixPort`を通じて消費する。CoverageReportはrequirementCoverageとcodeCoverageの統合結果のみを表現し、閾値チェック（要件カバレッジ100%・コードカバレッジ80%等）をドメイン層に持つ。

### 3.6 SkillStructureの設計

```
SkillStructure {
  requiredSections: SectionName[]    // 必須セクション一覧（順序付き）
  sectionOrder: SectionName[]        // 期待するセクション出現順序
}
```

SkillStructureはドメイン層にハードコードされたVO（設定ファイル由来ではない）。SKILL.mdの必須構造はビジネスルールとして安定しており、Configから動的に変更するものではない。

### 3.7 ci-governance依存の境界設計

LessonArtifact Schemaの所有権はci-governanceにあるため、以下の境界を設ける:
- ドメイン層: LessonArtifactの内部構造（Lesson配列・storyId）を定義
- `LessonArtifactSchemaPort`: ci-governance定義スキーマへのバリデーション委譲
- インフラ層: ci-governanceのスキーマファイルを読み込み、JSONスキーマバリデーション実行

これによりci-governanceがスキーマを変更した場合、インフラ層の実装変更のみで対応可能。

---

## 4. QA（設計判断の根拠）

### Q1: AtomicCommitはなぜ集約ルートではなくドメインサービスか

**質問**: TDDサイクル管理 + commit前検証 + commitメッセージ生成という複合操作を担うAtomicCommitは、集約ルートとして状態を持たせるべきではないか？

**推奨案**: commitはインフラ層のgit操作であり、ドメイン層に永続化すべき「commitの進行状態」は存在しない。L1+L2事前検証は外部UnitのValidatorへの委譲であり、その結果はCommitReadiness（VO）として受け取るだけ。TddCycleはcommit時点のサイクル状態のスナップショットであり、AtomicCommit自身が「状態を持って変化する」ことはない。したがってAtomicCommitServiceがこれらVOを受け取り、CommitReadinessを返すステートレスなドメインサービスとして定義するのが適切。

**結論**: AtomicCommitServiceはドメインサービス。CommitMessage・TddCycle・CommitReadinessはVO。実際のgit操作はGitPortに委譲。

### Q2: PlanCheckerLoopのループ状態はセッション内一時データであるが、集約として適切か

**質問**: PlanCheckerLoopはセッション中にのみ存在し、永続化されない。集約ルートとして定義することは過剰設計ではないか？

**推奨案**: 永続化の有無は集約の採否を決定する唯一の基準ではない。重要なのは「整合性責務」の有無である。PlanCheckerLoopは「最大3回という制約」「各試行の順序と結果の整合性」「状態遷移の一貫性（PASSED後はRUNNINGに戻らない）」というビジネスルールを強制する責務がある。これは単純なVOやドメインサービスでは表現困難であり、エンティティとしての識別性を持つ集約が適切。セッション外での永続化が不要でも、セッション内での状態整合性を保証するために集約構造を採用する。

**結論**: PlanCheckerLoopは集約ルートとして採用。セッション外の永続化は不要だが、整合性責務から集約が正当化される。

### Q3: LessonArtifactのスキーマ準拠をどの層で担うべきか

**質問**: LessonArtifact Schemaはci-governanceが所有する。本Unitのドメイン層でスキーマ準拠を検証すると、ci-governanceへの強い依存が生じないか？

**推奨案**: ドメイン層はLessonArtifactの内部構造（重複なし・storyId必須等のビジネスルール）のみを不変条件として保持する。ci-governance定義のJSONスキーマへの準拠検証はLessonArtifactSchemaPort（インフラ層実装）に委譲する。これにより、ci-governanceのスキーマ変更がドメイン層に波及しない。

**結論**: ドメイン層の不変条件とci-governanceスキーマ準拠を分離。後者はLessonArtifactSchemaPortで隠蔽。

### Q4: CascadeUpdateService はドメインサービスか、それとも単なるユースケースか

**質問**: 「Level 3完了後に関連ファイルへ@story-id HXX-XXを付与する」というCascadeUpdateの操作は、ドメイン固有のビジネスルールを含むのか、それとも単なるファイル操作の手順か？

**推奨案**: 「どのファイルをカスケード更新対象とするか」の決定ロジック（トレーサビリティグラフの探索、@story-id付与ルール）はビジネスルールであり、ドメインサービスに属する。実際のファイル読み書きはFileSystemPortに委譲する。これによりCascadeUpdateServiceはドメイン層の純粋な計算処理として定義でき、テスタビリティが確保される。

**結論**: CascadeUpdateServiceはドメインサービス。CascadeUpdateTarget・CascadeUpdateResultはVO。ファイル操作はFileSystemPortに委譲。

### Q5: SkillStructureはなぜConfigから動的ロードしないのか

**質問**: SKILL.mdの必須セクション構成はConfig（HarnessConfigV2）から可変にすべきではないか？

**推奨案**: SKILL.mdの必須構造はハーネスの設計仕様そのものであり、プロジェクト設定で変更できるものではない。これはconfigで可変にすることでむしろ設計の意図が失われる。SkillStructureはVO定数としてドメイン層にハードコードし、必要な場合はコードレベルの変更として管理する。

**結論**: SkillStructureはドメイン層のVO定数。ConfigQueryPortへの依存なし。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 | 利用サービス |
|--------|------|------|------------|
| GitPort | ドメイン→外部 | git commit実行・ステータス取得 | AtomicCommitService |
| ValidatorExecutionPort | ドメイン→外部 | L1+L2バリデーター実行（biome-ast-engine等）、CommitReadiness結果取得 | AtomicCommitService |
| RequirementTestMatrixPort | 外部→ドメイン | nyquist-validationのRequirementTestMatrixを消費・CoverageReport生成への入力 | CoverageReport（ユースケース層） |
| PlanCheckExecutorPort | ドメイン→外部 | 実際のPlan検証実行（外部ツール・ルール実行委譲） | PlanCheckerLoop（集約） |
| LessonSourceReaderPort | ドメイン→外部 | [Agent-Lesson]タグ付きエントリの収集元（会話ログ・ファイル）読み込み | LessonCollector |
| LessonArtifactWriterPort | ドメイン→外部 | 構築済みLessonArtifactをJSONファイルとして書き出し | LessonArtifact（集約） |
| LessonArtifactSchemaPort | ドメイン→外部 | ci-governance定義スキーマへの準拠検証委譲 | LessonArtifact（集約） |
| FileSystemPort | ドメイン→外部 | カスケード更新対象ファイルの読み書き | CascadeUpdateService |
| ValidatorIdRegistryPort | 外部→ドメイン | validator-systemのValidator ID Registryを参照 | CascadeUpdateService |
| SkillFileReaderPort | ドメイン→外部 | SKILL.mdファイルの読み込み | SkillStructureValidator |
| ConfigQueryPort | 外部→ドメイン | HarnessConfigV2から閾値設定（カバレッジ閾値等）参照 | CoverageReport（ユースケース層） |

---

## 6. ドメインモデル概要

### 集約

| 集約 | 集約ルート | 内包エンティティ/VO | 責務 |
|------|-----------|------------------|------|
| PlanCheckerLoop | PlanCheckerLoop | PlanCheckAttempt（VO）× 最大3 | ループ回数管理・試行結果整合性・最大3回制約強制 |
| LessonArtifact | LessonArtifact | Lesson（VO）× N（重複なし） | 教訓収集・重複排除・JSONファイル出力のI/O境界 |

### 値オブジェクト

| VO | 対応ストーリー | 説明 |
|----|-------------|------|
| CommitMessage | H12-01 | `feat({unit}/{HXX-XX}): {description}` 形式。format()で文字列生成 |
| TddCycle | H12-01 | Red→Green→Refactorの各ステップ状態（現在フェーズ + 完了フラグ） |
| CommitReadiness | H12-01 | L1+L2事前検証の統合結果（go/no-go + 違反詳細） |
| CoverageReport | H12-02 | 要件カバレッジ + コードカバレッジの統合結果（閾値判定含む） |
| RequirementCoverageResult | H12-02 | 要件単位のカバレッジ結果（総要件数・カバー済み数・未カバー要件ID一覧） |
| CodeCoverageResult | H12-02 | コード単位のカバレッジ率（行/分岐/関数） |
| PlanCheckAttempt | H12-03 | 各検証試行の記録（試行番号・検証結果・修正指示テキスト） |
| Lesson | H12-04 | 個々の教訓エントリ（[Agent-Lesson]タグ・content・sourceContext・fingerprint） |
| LessonFingerprint | H12-04 | 教訓重複検出用ハッシュ（content正規化後のfingerprint） |
| SourceContext | H12-04 | 教訓発生元情報（ファイルパス or コンテキスト記述） |
| CascadeUpdateTarget | H12-05 | 累積更新対象（ファイルパス + 付与するstory-idタグ文字列） |
| CascadeUpdateResult | H12-05 | 累積更新結果（更新ファイル数・付与story-id一覧・エラー一覧） |
| SkillStructure | H12-06 | SKILL.mdの必須セクション定義（順序付き必須セクション名一覧）。VO定数 |
| SkillValidationResult | H12-06 | SKILL.md検証結果（合否 + 違反セクション一覧 + 欠落セクション一覧） |

### ドメインサービス

| サービス | 対応ストーリー | 責務 |
|---------|-------------|------|
| AtomicCommitService | H12-01 | CommitMessage生成・CommitReadiness判定・commit前検証オーケストレーション |
| LessonCollector | H12-04 | [Agent-Lesson]タグを持つエントリをLessonSourceReaderPortから収集しLesson[]を生成 |
| LessonDeduplicator | H12-04 | LessonFingerprintによる重複検出・重複Lessonの統合 |
| CascadeUpdateService | H12-05 | @story-id HXX-XX付与対象の特定ロジック・CascadeUpdateTargetの生成 |
| SkillStructureValidator | H12-06 | SkillStructureとSKILL.md実体を比較しSkillValidationResultを生成 |

### 補助型

| 型 | 説明 |
|----|------|
| LoopStatus | `'RUNNING' \| 'PASSED' \| 'FAILED_EXCEEDED'` |
| TddPhase | `'RED' \| 'GREEN' \| 'REFACTOR'` |
| SectionName | `string`（SKILL.mdセクション名） |
| StoryId | Shared Kernelから継承（`HXX-XX` 形式） |
| UnitName | `string`（ハーネスのUnit識別子） |

---

## 7. 不変条件（予定）

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | PlanCheckerLoop | `attempts.length <= 3`（maxAttempts超過は即時エラー） |
| INV-2 | PlanCheckerLoop | `status=PASSED` への遷移は最後のPlanCheckAttemptが合格の場合のみ |
| INV-3 | PlanCheckerLoop | `status=PASSED` または `status=FAILED_EXCEEDED` 後は `addAttempt()` 呼び出し不可 |
| INV-4 | LessonArtifact | `lessons` 内のLessonFingerprintは一意（重複なし） |
| INV-5 | LessonArtifact | `storyId` は非空かつ `HXX-XX` 形式に準拠 |
| INV-6 | CommitMessage | `unit`・`storyId`・`description` はいずれも非空文字列 |
| INV-7 | CommitMessage | `format()` の結果は `feat({unit}/{storyId}): {description}` パターンに準拠 |
| INV-8 | CoverageReport | `requirementCoverage` と `codeCoverage` はいずれも非null |
| INV-9 | SkillStructure | `requiredSections` は1件以上（空リストは不正） |
| INV-10 | Lesson | `content` は非空文字列、`fingerprint` はcontent正規化後のハッシュと一致 |

---

## 8. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 依存: harness-error | HarnessError型の確定が前提。Wave 1で実装済み |
| 依存: config-foundation | HarnessConfigV2の確定が前提。Wave 1で実装済み |
| 依存: nyquist-validation | RequirementTestMatrix Schemaの確定が前提。RequirementTestMatrixPortの契約設計に影響する |
| 依存: ci-governance | LessonArtifact Schema定義の確定が前提。LessonArtifactSchemaPortの実装に影響する |
| 依存: validator-system | Validator ID Registryの確定が前提。CascadeUpdateServiceの対象特定ロジックに影響する |
| リスク: LessonArtifactスキーマ変更 | ci-governanceがLessonArtifact Schemaを変更した場合、LessonArtifactSchemaPort実装の更新が必要。ドメイン層への波及はポートで遮断するが、LessonArtifactの内部構造とスキーマの乖離が生じないよう継続的な検証が必要 |
| リスク: PlanCheckerLoopのセッション管理 | ループ状態はセッション内一時データだが、エージェント実行環境でのセッション境界が不明確な場合に「誰がPlanCheckerLoopを生成・破棄するか」の設計が必要。ユースケース層での明示的なライフサイクル管理を検討 |
| リスク: LessonFingerprintの衝突 | コンテンツ正規化後のハッシュに衝突が生じた場合に異なる教訓が重複とみなされる。ハッシュアルゴリズム選択（SHA-256等）と正規化方法の設計が必要 |
| リスク: @story-id付与パターンの変更 | H12-05のstory-idタグ形式（`@story-id HXX-XX`）が他Unitの慣例と異なる場合、CascadeUpdateServiceの検索・付与ロジックの修正が必要。実装前にtag形式の標準化確認が必要 |

---

## 9. 承認

- [ ] 人間承認済み（Phase 2着手許可）
