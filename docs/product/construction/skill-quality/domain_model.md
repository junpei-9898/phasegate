# ドメインモデル: skill-quality

@story-id H12-01
@story-id H12-02
@story-id H12-03
@story-id H12-04
@story-id H12-05
@story-id H12-06
@story-id H12-07
> **Unit ID**: skill-quality
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-19（Wave 2 初版）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H12-01〜H12-07
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §4（Shared Kernel最小化）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| PlanCheckerLoop | 集約ルート | ループ回数状態（currentRetry/maxRetries）と試行記録（loopHistory）を保持し、最大3回の検証→修正ループの整合性を保証する |
| LessonArtifact | 集約ルート | [Agent-Lesson]タグから収集した教訓エントリ（Lesson[]）を内包し、重複なし不変条件とJSONファイルI/O境界を担う |
| AtomicCommitService | ドメインサービス | TddCycle評価→CommitMessage生成→L1+L2事前検証→CommitReadiness判定をオーケストレートする |
| CascadeUpdateService | ドメインサービス | @story-id HXX-XX付与対象ファイルの特定ロジックと付与処理（純粋計算）を担う |
| LessonCollector | ドメインサービス | [Agent-Lesson]タグ付きエントリをLessonSourceReaderPortから収集しLesson[]を生成する |
| LessonDeduplicator | ドメインサービス | LessonFingerprintによる重複Lessonの検出と統合を担う |
| SkillStructureValidator | ドメインサービス | SkillStructure（必須セクション定義）とSKILL.md実体を比較し、SkillValidationResultを生成する |
| CommitMessage | 値オブジェクト | `feat({unit}/{HXX-XX}): {description}` 形式の検証済みコミットメッセージ。H12-07以降は任意で `Work-Item: WI-XXX` trailerを保持する |
| TddCycle | 値オブジェクト | Red→Green→Refactor各ステップの状態（phase/passed） |
| CommitReadiness | 値オブジェクト | L1+L2事前検証の統合結果（go/no-go + 違反詳細） |
| CoverageReport | 値オブジェクト | 要件カバレッジ（RequirementCoverageResult）とコードカバレッジ（CodeCoverageResult）の統合結果 |
| RequirementCoverageResult | 値オブジェクト | 要件単位のカバレッジ結果（総要件数・カバー済み数・未カバー要件ID一覧） |
| CodeCoverageResult | 値オブジェクト | コード単位のカバレッジ率（行/分岐/関数） |
| LoopAttempt | 値オブジェクト | ループ1回分の試行記録（attemptNumber/coverageRate/gaps/修正指示テキスト） |
| Lesson | 値オブジェクト | 個々の教訓エントリ（[Agent-Lesson]タグ・content・sourceContext・fingerprint） |
| LessonFingerprint | 値オブジェクト | content正規化後のSHA-256ハッシュ（重複検出用） |
| SourceContext | 値オブジェクト | 教訓発生元情報（ファイルパス or コンテキスト記述） |
| CascadeUpdateTarget | 値オブジェクト | 累積更新対象（ファイルパス + 付与するstory-idタグ文字列） |
| CascadeUpdateResult | 値オブジェクト | 累積更新結果（更新ファイル数・付与story-id一覧・エラー一覧） |
| SkillStructure | 値オブジェクト | SKILL.mdの必須セクション一覧（frontmatter/purpose/inputs/outputs/prerequisites/executionFlow）。ドメイン層ハードコードのVO定数 |
| SkillValidationResult | 値オブジェクト | SKILL.md検証結果（passed/missingSection[]/actualSections[]） |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | 全ドメインサービス・集約のエラー出力に使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | ConfigQueryPort経由でcoverageRate閾値・agentLessonCollection有効/無効を参照 | 読取専用 |
| StoryId | harness-api / Shared Kernel | LessonArtifact.storyId・CommitMessage.storyId・CascadeUpdateTarget.storyId | 読取専用 |

### 他Unitから受け取るCross-Unit Contract

| 型名 | 所有Unit | 利用目的 |
|------|---------|---------|
| RequirementTestMatrix Schema | nyquist-validation | RequirementTestMatrixPort経由でCoverageReport生成への入力として消費 |
| LessonArtifact Schema | ci-governance | LessonArtifactSchemaPort経由で出力LessonArtifactの準拠検証に使用 |
| ValidatorId | validator-system | ValidatorIdRegistryPort経由でCascadeUpdateService対象特定ロジックに使用 |

### 他Unitへ公開する契約

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| LessonArtifact JSON出力 | ci-governance | ci-governance定義スキーマ準拠のLesson artifactをJSONファイルとして出力 |
| SkillValidationResult | regression-suite | SKILL.md構造検証結果を回帰テスト検証に提供 |

---

## 2. Aggregate Boundary

### 結論: 集約2つ（PlanCheckerLoop + LessonArtifact）

横断契約§6の集約降格方針を参照しつつ、以下の分析により集約2つ＋VOとドメインサービスの構成とした。

### PlanCheckerLoop（集約ルート）を維持する根拠

- **明確な状態**: `currentRetry`（0〜3）という状態変数を持ち、現在何回目の検証かによって動作が分岐する
- **整合性責務**: 「前回の検証結果を踏まえた次回の修正指示」という連続性があり、複数のLoopAttemptの順序と整合性を集約が管理する
- **ビジネスルール強制**: 最大3回という制約（3回超過でエラー）はPlanCheckerLoop自身が担う不変条件であり、外部から破壊できないようにカプセル化が必要
- **状態遷移の保護**: `PASSED`状態への遷移は最後の試行合格時のみ可能、`PASSED/FAILED_EXCEEDED`後は新たな試行を追加できないというルールは、単純なVOでは表現不可能

**永続化不要でも集約を採用する根拠**: 永続化の有無は集約採否の唯一基準ではない。セッション内一時データであっても、ループを制御する「整合性ある複数VOの管理」と状態遷移の一貫性保証に集約構造が必要。

### LessonArtifact（集約ルート）を維持する根拠

- **明確なI/O境界**: lesson artifactはJSONファイルとして出力される明確な境界を持つ
- **整合性責務**: 複数のLesson（各教訓エントリ）を収集・重複排除した上でartifactを構成するという整合性管理が必要
- **不変条件の強制**: 「重複なしの有効な教訓コレクション」という不変条件を集約ルートが強制する（LessonFingerprintの一意性）
- **スキーマ所有権の明確化**: LessonArtifact Schemaはci-governanceが所有するが、内部構造の整合性はLessonArtifact集約が担い、スキーマ準拠はLessonArtifactSchemaPortに委譲することで責務を分離

### AtomicCommitをドメインサービスに降格した根拠

- **状態なし**: commitはインフラ層のgit操作であり、ドメイン層に永続化すべき「commitの進行状態」は存在しない
- **ライフサイクルなし**: commitは作成されると即座に完了であり、「進行中のAtomicCommit」という概念はセッション内一時データに過ぎない
- **外部委譲のみ**: L1+L2事前検証は外部UnitのValidatorへの委譲、実際のgit操作はGitPortへの委譲であり、AtomicCommit自身は「検証済みのCommitMessage + TddCycle状態」を取りまとめるだけ
- **永続化不要**: commitメッセージの形式検証結果・TDDサイクル状態はcommit実行後に破棄される

### CascadeUpdateをドメインサービスに降格した根拠

- **ライフサイクル不明確**: Level 3完了後に実行され完了すれば終わりであり、進行中状態を管理する必要がない
- **ステートレス計算**: 更新対象特定ロジックは「設定ファイル + ストーリーIDを入力してターゲットファイル一覧を出力」という純粋計算
- **更新記録の責務分離**: 「何を更新したか」の記録（トレーサビリティ）はci-governanceの責務であり、本Unitは操作実行に過ぎない
- **副作用はポート経由**: 永続化が必要な状態は「どのファイルを更新したか」のみであり、これはFileSystemPortへの書き込み副作用として表現される

---

## 3. Model Classification

### 集約ルート

| 集約 | 集約ルート | 内包VO | ライフサイクル | 責務 |
|------|-----------|--------|--------------|------|
| PlanCheckerLoop | PlanCheckerLoop | LoopAttempt[] (最大3件) | セッション開始時生成 → ループ完了（PASSED/FAILED_EXCEEDED）で終了 | ループ回数管理・試行結果整合性・最大3回制約強制・状態遷移保護 |
| LessonArtifact | LessonArtifact | Lesson[] (重複なし), LessonFingerprint[] | H12-04ストーリー実行時生成 → JSONファイル出力で完了 | 教訓収集・重複排除・I/O境界・ci-governanceスキーマ準拠 |

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 対応ストーリー | 説明 |
|-------------|------|---------|-------------|------|
| CommitMessage | ✓ | ✓ | H12-01 / H12-07 | `feat({unit}/{HXX-XX}): {description}` 形式。`workItemId` 指定時は `Work-Item: WI-XXX` trailerを付与する |
| TddCycle | ✓ | ✓ | H12-01 | Red→Green→Refactorの各ステップ状態。`phase: TddPhase`, `passed: boolean` |
| CommitReadiness | ✓ | ✓ | H12-01 | L1+L2事前検証統合結果。`ready: boolean`, `violations: ValidationViolation[]` |
| CoverageReport | ✓ | ✓ | H12-02 | 要件カバレッジ + コードカバレッジの統合結果。閾値判定メソッド付き |
| RequirementCoverageResult | ✓ | ✓ | H12-02 | 総要件数・カバー済み数・未カバー要件ID一覧 |
| CodeCoverageResult | ✓ | ✓ | H12-02 | 行/分岐/関数カバレッジ率 |
| LoopAttempt | ✓ | ✓ | H12-03 | 試行番号・カバレッジ率・gaps（未達項目）・修正指示テキスト |
| Lesson | ✓ | ✓ | H12-04 | [Agent-Lesson]タグ・content・sourceContext・fingerprint |
| LessonFingerprint | ✓ | ✓ | H12-04 | content正規化後のSHA-256ハッシュ。重複検出の識別子 |
| SourceContext | ✓ | ✓ | H12-04 | 教訓発生元情報（ファイルパス or コンテキスト記述） |
| CascadeUpdateTarget | ✓ | ✓ | H12-05 | 更新対象ファイルパス + 付与するstory-idタグ文字列 |
| CascadeUpdateResult | ✓ | ✓ | H12-05 | 更新ファイル数・付与story-id一覧・エラー一覧 |
| SkillStructure | ✓ | ✓ | H12-06 | 必須セクション一覧（frontmatter/purpose/inputs/outputs/prerequisites/executionFlow）。VO定数。 |
| SkillValidationResult | ✓ | ✓ | H12-06 | 検証結果（passed/missingSection[]/actualSections[]） |

### 補助型

| 型 | 説明 |
|---|------|
| LoopStatus | `'RUNNING' \| 'PASSED' \| 'FAILED_EXCEEDED'` |
| TddPhase | `'RED' \| 'GREEN' \| 'REFACTOR'` |
| SectionName | `string`（SKILL.mdセクション名。例: `'## 目的'`, `'## 入力'`） |
| UnitName | `string`（ハーネスのUnit識別子。例: `'skill-quality'`） |
| ISODateString | `string`（ISO 8601形式の日時文字列） |
| ValidationViolation | `{ ruleId: string; message: string; location?: string }` |

### ドメインサービス

| サービス | 対応ストーリー | 責務 | 参照するポート |
|---------|-------------|------|--------------|
| AtomicCommitService | H12-01 | TddCycle評価 → CommitMessage生成 → ValidatorExecutionPortでL1+L2検証 → CommitReadiness判定 → GitPort経由でcommit実行 | GitPort, ValidatorExecutionPort |
| LessonCollector | H12-04 | [Agent-Lesson]タグ付きエントリをLessonSourceReaderPortから収集しLesson[]を生成 | LessonSourceReaderPort |
| LessonDeduplicator | H12-04 | LessonFingerprintによる重複Lesson検出・Lesson[]から重複を除去して統合 | （ポートなし: 純粋計算） |
| CascadeUpdateService | H12-05 | @story-id HXX-XX付与対象ファイルの特定（ValidatorIdRegistryPort参照）・CascadeUpdateTarget生成・FileSystemPortでファイル更新 | FileSystemPort, ValidatorIdRegistryPort |
| SkillStructureValidator | H12-06 | SkillFileReaderPortでSKILL.md読み取り → SkillStructure（VO定数）と比較 → SkillValidationResult生成 | SkillFileReaderPort |

---

## 4. Port Interfaces

| ポート名 | 方向 | 責務 | 利用ドメインオブジェクト |
|---------|------|------|----------------------|
| GitPort | ドメイン→外部 | git commit実行・ステータス取得（実際のgit操作委譲） | AtomicCommitService |
| ValidatorExecutionPort | ドメイン→外部 | L1バリデーター（構文/形式）+ L2バリデーター（biome-ast-engine等）を実行し、CommitReadiness生成への入力（ValidationViolation[]）を返す | AtomicCommitService |
| RequirementTestMatrixPort | 外部→ドメイン | nyquist-validationのRequirementTestMatrix（requirement-test-matrix.json）を読み取り・書き込み。CoverageReport生成の入力データを提供 | CoverageReport（ユースケース層経由） |
| PlanCheckExecutorPort | ドメイン→外部 | PlanCheckerLoopのループ内で実際のPlan検証実行（外部ツール・ルール実行を委譲）。LoopAttempt生成への入力（coverageRate/gaps）を返す | PlanCheckerLoop（集約） |
| LessonSourceReaderPort | ドメイン→外部 | ソースコード・コミットメッセージ・設計文書から[Agent-Lesson]タグ付きエントリを読み取る | LessonCollector |
| LessonArtifactWriterPort | ドメイン→外部 | 構築済みLessonArtifactをci-governance定義スキーマ準拠のJSONファイルとして出力 | LessonArtifact（集約） |
| LessonArtifactSchemaPort | ドメイン→外部 | ci-governance定義のLessonArtifact Schemaを取得し、LessonArtifactのスキーマ準拠を検証。ci-governanceスキーマ変更の波及をドメイン層で遮断 | LessonArtifact（集約） |
| FileSystemPort | ドメイン→外部 | カスケード更新対象ファイルの読み取り・@story-id HXX-XX付与後の書き込み | CascadeUpdateService |
| ValidatorIdRegistryPort | 外部→ドメイン | validator-systemのValidator ID Registry（L1+L2 ValidatorId一覧）を参照。CascadeUpdateServiceの更新対象特定に使用 | CascadeUpdateService |
| SkillFileReaderPort | ドメイン→外部 | SKILL.mdファイルの読み取り（パス指定 → ファイル内容返却） | SkillStructureValidator |
| ConfigQueryPort | 外部→ドメイン | HarnessConfigV2からcoverageRate閾値（要件カバレッジ/コードカバレッジ）・agentLessonCollection有効/無効設定を取得 | CoverageReport（ユースケース層）, LessonCollector |

---

## 5. Domain Rules and Invariants

### 不変条件

| INV | 対象 | 内容 | 違反時の動作 |
|-----|------|------|------------|
| INV-1 | PlanCheckerLoop | `loopHistory.length <= maxRetries`（maxRetries=3固定）。超過は即時HarnessError | `addAttempt()`でHarnessErrorをthrow |
| INV-2 | PlanCheckerLoop | `status=PASSED`への遷移は最後のLoopAttemptの検証結果が合格（gaps=[]）の場合のみ | `complete()`でgaps非空ならHarnessError |
| INV-3 | PlanCheckerLoop | `status=PASSED`または`status=FAILED_EXCEEDED`後は`addAttempt()`呼び出し不可 | HarnessErrorをthrow |
| INV-4 | PlanCheckerLoop | `maxRetries`は3固定（設定変更不可） | コンストラクタで3以外を渡した場合はHarnessError |
| INV-5 | LessonArtifact | `lessons`内のLessonFingerprintは一意（重複なし） | `addLesson()`でfingerprint衝突ならHarnessError |
| INV-6 | LessonArtifact | `storyId`は非空かつ`HXX-XX`形式に準拠 | コンストラクタでHarnessError |
| INV-7 | LessonArtifact | `lessonId`（artifact識別子）は一意 | LessonArtifactWriterPort実装レベルで保証 |
| INV-8 | CommitMessage | `unit`・`storyId`・`description`はいずれも非空文字列 | コンストラクタでHarnessError |
| INV-9 | CommitMessage | `format()`の結果は`feat({unit}/{storyId}): {description}`パターンに準拠 | 生成時に検証済みのため実行時違反なし |
| INV-9a | CommitMessage | `workItemId`を指定する場合は`WI-\d+`に一致する | コンストラクタでHarnessError |
| INV-10 | SkillStructure | `requiredSections`は変更不可（ドメイン層でハードコード）かつ1件以上 | VO定数のため実行時変更不可 |
| INV-11 | Lesson | `content`は非空文字列、`fingerprint`はcontent正規化後のSHA-256ハッシュと一致 | コンストラクタでHarnessError |
| INV-12 | CoverageReport | `requirementCoverage`と`codeCoverage`はいずれも非null | コンストラクタでHarnessError |

### PlanCheckerLoopのループルール

```
[評価順序]
1. PlanCheckExecutorPortへPlan評価を委譲
2. 返却されたcoverageRate/gapsからLoopAttemptを生成
3. PlanCheckerLoop.addAttempt(attempt)を呼び出す
   └── INV-1チェック: loopHistory.length < maxRetries(3) であること
4. gapsが空（[]）ならPlanCheckerLoop.complete(passed=true) → status=PASSED
5. gapsが非空かつloopHistory.length < 3なら再試行継続（status=RUNNING）
6. gapsが非空かつloopHistory.length == 3なら PlanCheckerLoop.fail() → status=FAILED_EXCEEDED

[エスカレーション条件]
- status=FAILED_EXCEEDED: ユースケース層がHarnessErrorとして上位に報告
- ループ停止後はPlanCheckerLoopインスタンスを破棄（セッション内一時データ）
```

**状態遷移ダイアグラム**:

```
[初期状態: RUNNING / loopHistory=[]]
         ↓ addAttempt() → gaps=[]
    [PASSED（成功終了）]

[RUNNING / loopHistory=[a1]]
         ↓ addAttempt() → gaps!=[] / length<3
[RUNNING / loopHistory=[a1,a2]]
         ↓ addAttempt() → gaps!=[] / length<3
[RUNNING / loopHistory=[a1,a2,a3]]
         ↓ fail()（length==maxRetries, gaps!=[]）
[FAILED_EXCEEDED（上限超過エラー）]
```

### AtomicCommitServiceの事前検証ルール

```
[L1+L2通過保証フロー]
1. TddCycleのphase=REFACTORかつpassed=trueであること（L0チェック）
2. ValidatorExecutionPort.runL1(commitMessage): L1検証（構文・形式）実施
   └── violations非空ならCommitReadiness { ready: false, violations }を返却（commit実行しない）
3. ValidatorExecutionPort.runL2(commitMessage): L2検証（biome-ast-engine等）実施
   └── violations非空ならCommitReadiness { ready: false, violations }を返却
4. L1+L2が全て通過した場合のみ GitPort.commit(commitMessage) を実行
5. CommitReadiness { ready: true, violations: [] }を返却

[事前条件]
- TddPhase != REFACTOR（RED/GREENで呼び出し）→ HarnessError: TDD_CYCLE_INCOMPLETE
- CommitMessage形式違反 → HarnessError: INVALID_COMMIT_FORMAT（コンストラクタで検出済み）
```

### LessonDeduplicatorの重複判定ルール

```
[重複判定アルゴリズム]
1. Lesson.contentを正規化（空白統一・改行統一・大文字小文字統一）
2. 正規化済みcontentのSHA-256ハッシュ → LessonFingerprintを生成
3. 既存LessonのLessonFingerprint一覧と照合
4. 同一fingerprintが存在する場合: 重複と判定
   └── デフォルト動作: 先着のLessonを優先（後発を破棄）
   └── SourceContextが異なる場合: SourceContextを配列に統合したLessonを生成（オプション）
5. 重複なしLesson[]を返却

[SHA-256衝突リスクへの対応]
- 衝突確率は無視できるレベル（2^-128オーダー）であり、実用上問題なし
- content正規化の標準化: Unicode正規化（NFC）→ 全角スペース→半角変換 → 連続空白→単一空白 → trim()
```

---

## 6. Data Flow

### H12-01: Atomic Git Commits + TDD品質契約

```
[入力: TDDサイクル状態 + コミット情報]
  TddCycle { phase: 'REFACTOR', passed: true }
  CommitMessage { unit: 'skill-quality', storyId: 'H12-01', description: '...' }
         ↓
AtomicCommitService.evaluate(tddCycle, commitMessage)
  ├── TddCycle.phase チェック（REFACTOR + passed=trueであること）
  ├── ValidatorExecutionPort.runL1(commitMessage) → ValidationViolation[]
  ├── ValidatorExecutionPort.runL2(commitMessage) → ValidationViolation[]
  └── violations空 → GitPort.commit(commitMessage)
         ↓
CommitReadiness { ready: true/false, violations: [] / [...] }
         ↓
[出力: コミット実行結果またはエラー詳細]
```

### H12-02: test-coverage-checker Nyquist Validation統合

```
[入力: ストーリーID]
  StoryId { value: 'H12-02' }
         ↓
ユースケース層: CoverageCheckUseCase
  ├── ConfigQueryPort → coverageThreshold { requirement: 100, code: 80 }
  ├── RequirementTestMatrixPort → RequirementTestMatrix（nyquist-validation所有）
  └── 集計処理
      ├── RequirementCoverageResult { total, covered, uncoveredIds[] }
      └── CodeCoverageResult { lineCoverage, branchCoverage, functionCoverage }
         ↓
CoverageReport { requirementCoverage, codeCoverage }
  └── CoverageReport.meetsThreshold(threshold) → boolean
         ↓
[出力: カバレッジ合否 + 未カバー項目一覧]
```

### H12-03: implementation-readiness-checker Plan-Checker Loop統合

```
[入力: 計画文書]
  planDocument: string
         ↓
PlanCheckerLoop.create({ maxRetries: 3 })  ← INV-4: maxRetries=3固定
  [ループ開始: status=RUNNING]
         ↓
  PlanCheckExecutorPort.evaluate(planDocument, previousAttempts)
    → { coverageRate: number, gaps: string[] }
         ↓
  LoopAttempt.create({ attemptNumber, coverageRate, gaps, revision })
  PlanCheckerLoop.addAttempt(attempt)
    ├── INV-1チェック
    ├── gaps=[] → PlanCheckerLoop.complete() → status=PASSED
    └── gaps!=[] かつ length<3 → 継続（status=RUNNING）
         ↓（最大3回繰り返し）
  gaps!=[] かつ length==3 → PlanCheckerLoop.fail() → status=FAILED_EXCEEDED
         ↓
[出力: LoopStatus + loopHistory（全試行記録）]
  PASSED: 計画承認済み
  FAILED_EXCEEDED: HarnessError（エスカレーション）
```

### H12-04: Agent-Lesson System（lesson artifact出力）

```
[入力: ストーリーID + 収集対象（ファイル/コミット/設計文書）]
  StoryId { value: 'H12-04' }
  sources: SourcePath[]
         ↓
LessonCollector.collect(sources)
  └── LessonSourceReaderPort.read(source) → RawLessonEntry[]
      （[Agent-Lesson]タグ付きエントリを抽出）
  → Lesson[] （重複含む）
         ↓
LessonDeduplicator.deduplicate(lessons)
  └── LessonFingerprint生成 → 重複除去
  → Lesson[] （重複なし）
         ↓
LessonArtifact.create({ storyId, lessons })
  └── INV-5: fingerprint一意性チェック
         ↓
LessonArtifactSchemaPort.validate(lessonArtifact)
  └── ci-governance定義スキーマへの準拠確認
         ↓
LessonArtifactWriterPort.write(lessonArtifact)
  → lessons/{storyId}.lesson.json 出力
         ↓
[出力: LessonArtifact JSON（ci-governanceスキーマ準拠）]
```

### H12-05: Cascade Updater拡張（@story-id HXX-XX自動付与）

```
[入力: 完了ストーリーID]
  StoryId { value: 'H12-05' }
         ↓
CascadeUpdateService.resolve(storyId)
  ├── ValidatorIdRegistryPort.list() → ValidatorId[]（更新対象特定に使用）
  ├── ConfigQueryPort → cascadeUpdateTargetPatterns
  └── 対象ファイル特定ロジック（純粋計算）
  → CascadeUpdateTarget[] { filePath, storyIdTag: '@story-id H12-05' }
         ↓
CascadeUpdateService.apply(targets)
  └── targets.forEach(target →
        FileSystemPort.read(target.filePath)
        → content with @story-id HXX-XX 付与
        → FileSystemPort.write(target.filePath, updatedContent))
         ↓
CascadeUpdateResult { updatedCount, appliedStoryIds, errors }
         ↓
[出力: 更新結果サマリー + エラー一覧]
```

### H12-06: スキルSKILL.md構造維持検証

```
[入力: SKILL.mdファイルパス]
  skillFilePath: string
         ↓
SkillStructureValidator.validate(skillFilePath)
  ├── SkillFileReaderPort.read(skillFilePath) → rawContent: string
  ├── SkillStructure（VOC定数）:
  │   requiredSections: ['frontmatter', 'purpose', 'inputs', 'outputs',
  │                      'prerequisites', 'executionFlow']
  └── rawContentからsection一覧を抽出 → actualSections: string[]
      SkillStructure.requiredSections と actualSections を照合
      → missingSection = requiredSections.filter(s => !actualSections.includes(s))
         ↓
SkillValidationResult {
  passed: missingSection.length === 0,
  missingSection,
  actualSections
}
         ↓
[出力: SkillValidationResult（合否 + 欠落セクション一覧）]
```

---

## 7. 設計判断記録

### D1: AtomicCommit集約降格の理由

Unit定義§4ではAtomicCommitを集約ルート候補として記載していたが、以下の理由でAtomicCommitServiceへの降格を決定した。

commitというI/O操作（実際のgit commit実行）はinfrastructure層が担う。ドメイン層に永続化すべき「commitの進行状態」は存在しない。L1+L2事前検証もそれぞれのユニット（biome-ast-engine等）への委譲であり、AtomicCommit自身は「検証済みのCommitMessage + TddCycle状態」を取りまとめるだけでライフサイクルを持たない。commitは作成されると即座に完了であり、「進行中のAtomicCommit」という概念はセッション内一時データに過ぎない。

ドメインサービス化によってAtomicCommitServiceはステートレスなオーケストレーターとなり、CommitMessage・TddCycle・CommitReadinessをVOとして維持しつつ、git操作はGitPort、バリデーターはValidatorExecutionPortに委譲するクリーンな設計が実現できる。

### D2: CascadeUpdate集約降格の理由

CascadeUpdateは「Level 3完了後に関連ファイルへ@story-id HXX-XXを付与する」という操作であり、ドメイン固有のビジネスルール（どのファイルをカスケード更新対象とするかの決定ロジック）はドメインサービスに属するが、ライフサイクル管理が不要なためドメインサービスとした。

CascadeUpdate自体のライフサイクルが不明確（Level 3完了後に実行され完了すれば終わり）であり、「更新記録」はci-governanceの責務である。更新対象特定ロジックはステートレスな計算（設定ファイル + ストーリーIDを入力してターゲットファイル一覧を出力）であり、永続化が必要な状態は「どのファイルを更新したか」のみでFileSystemPortへの書き込み副作用として表現される。

CascadeUpdateServiceとしてドメインサービス化することで、CascadeUpdateTarget・CascadeUpdateResultをVOとして定義し、テスタビリティを確保した。

### D3: LessonArtifact集約維持の理由

LessonArtifactは以下の理由で集約ルートとして維持した。

JSONファイルとして出力される明確なI/O境界があり、複数のLesson（各教訓エントリ）を収集・重複排除した上でartifactを構成するという整合性責務がある。「重複なしの有効な教訓コレクション」という不変条件（INV-5: LessonFingerprintの一意性）は集約ルートが強制する必要がある。

スキーマ所有権については、LessonArtifact Schemaはci-governanceが所有するが、本Unitはスキーマに準拠して出力するだけである。ドメイン層のLessonArtifactは内部整合性（重複なし・storyId必須等のビジネスルール）のみを不変条件として保持し、ci-governance定義のJSONスキーマへの準拠検証はLessonArtifactSchemaPort（インフラ層実装）に委譲する。これによりci-governanceのスキーマ変更がドメイン層に波及しない。

### D4: PlanCheckerLoop集約維持の理由

PlanCheckerLoopはセッション内一時データだが、以下の理由で集約ルートとして採用した。

永続化の有無は集約採否を決定する唯一の基準ではない。重要なのは「整合性責務」の有無である。PlanCheckerLoopは「最大3回という制約」「各試行の順序と結果の整合性」「状態遷移の一貫性（PASSED後はRUNNINGに戻らない）」というビジネスルールを強制する責務がある。これは単純なVOやドメインサービスでは表現困難であり、識別性を持つ集約が適切。

セッション外での永続化が不要でも、セッション内での状態整合性を保証するために集約構造を採用する。ユースケース層でPlanCheckerLoopのライフサイクル（生成・ループ管理・破棄）を明示的に管理することでセッション境界の問題を解決する。

### D5: LessonArtifact SchemaをLessonArtifactSchemaPort経由で参照する理由

LessonArtifact Schemaの所有権がci-governanceにあることから、ドメイン層が直接スキーマに依存するとci-governanceのスキーマ変更がドメイン層に波及するリスクが生じる。

LessonArtifactSchemaPortを導入することで、ci-governanceスキーマへのバリデーション委譲をポートで隠蔽し、インフラ層の実装のみが実際のスキーマファイルを参照する。ci-governanceがスキーマを変更した場合、インフラ層の実装変更のみで対応可能となり、ドメイン層への波及を遮断できる。

これはヘキサゴナルアーキテクチャにおける「依存の方向を制御する」という原則の直接的な適用であり、外部ユニットのスキーマ変更からドメインモデルを保護する。

---

## 8. 品質評価（engineering-perspective）

### ドメインスメルチェック

- **責務混在（Bloated Service）**: AtomicCommitServiceはオーケストレーションのみを担い、実際のgit操作はGitPort、検証はValidatorExecutionPortに委譲 → 問題なし
- **不適切なVO（Mutable VO）**: PlanCheckerLoopの状態遷移をエンティティ（集約ルート）として維持し、VOに落とし込まない → 正当な判断
- **Anemic Domain Model**: LessonArtifact.addLesson()・PlanCheckerLoop.addAttempt()など、ビジネスルールを集約メソッドにカプセル化 → 問題なし
- **スキーマ所有権の混乱**: LessonArtifactSchemaPortによりci-governanceスキーマへの直接依存を排除 → 問題なし
- **言語の乖離**: PlanCheckerLoop/LessonArtifact/AtomicCommitService/CascadeUpdateServiceはH12ストーリーのユビキタス言語に準拠 → 問題なし
- **過剰集約**: CascadeUpdate・AtomicCommitのドメインサービス降格により集約数を2つに最小化 → 適切
- **SkillStructureの不変性確保**: VO定数としてドメイン層にハードコードし、外部設定からの動的変更を禁止 → 問題なし

### SOLID評価

- **SRP（単一責務）**: AtomicCommitServiceが検証/コミットオーケストレーション、LessonCollectorが収集、LessonDeduplicatorが重複排除、CascadeUpdateServiceが付与計算、SkillStructureValidatorが構造検証に単一化 → 遵守
- **OCP（開放閉鎖）**: SkillStructure.requiredSectionsを変更する場合はコードレベルの変更として管理（設定から分離） → 遵守
- **LSP（リスコフ置換）**: ポートインターフェース定義により、インフラ実装の交換が可能 → 遵守
- **ISP（インターフェース分離）**: 11本のポートが責務ごとに分離（GitPort/ValidatorExecutionPort/RequirementTestMatrixPort等） → 遵守
- **DIP（依存方向逆転）**: ドメイン層がポートを定義し、infrastructure層がPortを実装（外向き依存） → 遵守

### シンプルさ評価

- 集約2つ・ドメインサービス5つ・VO14種のバランスのとれた構成
- 6ストーリーをカバーしながらも各ドメインサービスが単一ストーリーに対応する明確な責務分割
- LessonDeduplicatorはポート依存なしの純粋計算（テスタビリティ最高）
- PlanCheckerLoopのセッション内一時データという特性を集約で表現することで、永続化インフラへの依存を回避
- 11本のポートはそれぞれ単一の外部依存を隠蔽し、テスト時のモック差し替えが容易

### 評価結果

ドメインスメルなし。SOLID原則遵守。集約降格方針（横断契約§6）に準拠した最小集約構成。設計を確定する。
