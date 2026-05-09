# ドメインモデル: ci-governance

@story-id H13-01
@story-id H13-02
@story-id H13-03
> **Unit ID**: ci-governance
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-19（Wave 2 初版）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H13-01〜H13-03
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §4（Shared Kernel最小化）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| CiTemplate | 集約ルート | templateType（`aidlc-gate` / `consistency-check` / `pre-commit`）を識別子とするCI/CDテンプレート仕様宣言。TemplateConfig（VO）を内包し、バリデータ実行設定との整合性を保証する |
| ErrorRepetition | 集約ルート | HarnessError.code を識別子とする反復エラー追跡。occurrenceCount状態遷移・escalatedフラグ管理を担う。`.harness/error-history.json`へ永続化 |
| AgentsMdPointer | 集約ルート | AGENTS.mdのファイルI/O境界。PointerEntry[]整合性（Dead Pointer禁止）とadrLinks[]を管理する |
| TemplateConfig | 値オブジェクト | テンプレートごとのバリデータ実行設定（targetValidatorIds / triggerCondition / failOnWarning） |
| EscalationAction | 値オブジェクト | エスカレーション時のアクション定義（logLevel / messageTemplate）の宣言的表現 |
| RepetitionResetCondition | 値オブジェクト | エラー繰り返しカウントのリセット条件（resetOnResolution） |
| PointerEntry | 値オブジェクト | 個別ポインタ定義（CommandPointer / FilePointerのUnion型） |
| LessonArtifact | 値オブジェクト | skill-qualityが出力するlesson artifact。**本Unitがスキーマオーナー** |
| TemplateGenerator | ドメインサービス | Preset設定 → CiTemplate生成。ValidatorIdRegistryPort + PresetConfigPortを参照 |
| RepetitionDetector | ドメインサービス | ErrorRepetition集約のoccurrenceCount更新・閾値判定・escalatedフラグ制御 |
| PointerValidator | ドメインサービス | PointerEntry[]の実在性検証（CommandExistencePort + FileExistencePort） |
| LessonAggregator | ドメインサービス | LessonArtifact[] → AgentsMdPointerへの集約・反映（重複lessonId検出） |
| LessonArtifactSchema | Cross-Unit Contract | `docs/contracts/lesson-artifact.schema.json`に配置。skill-qualityが参照するJSONスキーマ |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | ErrorRepetitionの繰り返し検出対象。HarnessError.codeがErrorRepetition識別子 | 読取専用 |
| HarnessErrorCode | harness-error | ErrorRepetition集約の識別子として使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | PresetConfigPortを通じてPreset設定・テンプレート設定を参照 | 読取専用 |
| PresetId | config-foundation | TemplateGenerator.generateConfig()の引数として使用 | 読取専用 |

### 他Unitから受け取るCross-Unit Contract

| 型名 | 所有Unit | 利用目的 |
|------|---------|---------|
| ValidatorId | validator-system | TemplateConfig.targetValidatorIdsの型として使用 |
| AdrFrontmatter | adr-foundation | AgentsMdPointer.adrLinksの参照先検証（AdrExistencePort経由） |
| CommandName | harness-api | CommandExistencePortでの実在性確認対象 |

### 他Unitへ公開する契約

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| LessonArtifact Schema | skill-quality | `docs/contracts/lesson-artifact.schema.json`として公開。skill-qualityのlesson artifact出力仕様を規定するCross-Unit Contract |

---

## 2. Aggregate Boundary

### 結論: 集約ルート3つ（CiTemplate / ErrorRepetition / AgentsMdPointer）

横断契約§6の集約降格方針を参照しつつ、以下の分析により3集約を維持する構成とした。

### CiTemplateを集約ルートとして維持する根拠

- **複合整合性**: templateTypeとTemplateConfig（targetValidatorIds / triggerCondition / failOnWarning）の複合フィールド間の整合性（例: presetRefが指すPresetはtargetValidatorIdsを包含していること）を保証する責務がある
- **ドメインロジックの存在**: TemplateGeneratorが導出したTemplateConfig（VO）をCiTemplateに組み込む `withConfig()` 操作はドメインロジックであり、純粋なVOでは状態と整合性を表現できない
- **仕様の宣言**: テンプレートの「何を実行するか」という設定を一元管理する責務がある

**永続化なし**: CiTemplate集約はメモリ上でのみ存在する。テンプレートYAMLファイルへの書き出しはTemplateRendererPortに委譲し、ドメイン層は「仕様宣言」のみを保持する。

### ErrorRepetitionを集約ルートとして維持する根拠

- **状態遷移**: `occurrenceCount` の `increment()` → `isEscalated()` → `reset()` という明確な状態遷移ライフサイクルがある
- **永続化の必要性**: エラーコードごとにインスタンスが存在し、`.harness/error-history.json`への永続化が必要
- **ビジネスルール内包**: `threshold`（デフォルト3回）との比較によるescalatedフラグ遷移はドメインルールであり、集約内に閉じ込める責務がある
- **VO内包**: EscalationAction・RepetitionResetCondition（VO）を内包し、これらとoccurrenceCountの整合性を保証する

### AgentsMdPointerを集約ルートとして維持する根拠

- **ファイルI/O境界**: AGENTS.mdというファイルI/O境界がある（読み取り元かつ書き込み先）
- **Dead Pointer禁止不変条件**: PointerEntry[]全体の整合性として「Dead Pointer禁止」をドメイン層で保証する責務がある
- **複合管理**: PointerEntry[]とadrLinks[]の整合性（参照先ADRが存在すること）を集約内で統括すべき

---

## 3. Model Classification

### 集約ルート

| 集約ルート | 識別子 | 永続化 | ライフサイクル |
|-----------|--------|--------|--------------|
| CiTemplate | templateType（`TemplateType`） | なし（都度Preset設定から再構築） | TemplateGeneratorが生成 → TemplateRendererPortへ渡してYAML書き出し |
| ErrorRepetition | code（`HarnessErrorCode`） | あり（`.harness/error-history.json`） | 初回エラー発生で生成 → increment/escalate → reset。ErrorRepetitionRepositoryPortで管理 |
| AgentsMdPointer | —（プロジェクト単一インスタンス） | あり（AGENTS.md） | AgentsMdPortで読み取り → pointers操作 → AgentsMdPortで書き込み |

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 説明 |
|-------------|------|---------|------|
| TemplateConfig | ✓ | ✓ | `targetValidatorIds: ValidatorId[]`（1件以上必須）, `triggerCondition: TriggerCondition`, `failOnWarning: boolean` |
| EscalationAction | ✓ | ✓ | `logLevel: 'warn' \| 'error'`, `messageTemplate: string`。アクションの宣言的表現のみを保持。実行はEscalationExecutorPortに委譲 |
| RepetitionResetCondition | ✓ | ✓ | `resetOnResolution: boolean`。escalated=trueかつ本条件成立時のみreset()呼び出し可能 |
| PointerEntry | ✓ | ✓ | Union型: `CommandPointer \| FilePointer`。ポインタ種別ごとの参照先情報を保持 |
| LessonArtifact | ✓ | ✓ | `lessonId: string`（UUID）, `source: string`, `content: string`, `tags: string[]`, `timestamp: ISO8601DateString`。本Unitがスキーマオーナー |

### 補助型

| 型 | 説明 |
|---|------|
| TemplateType | `'aidlc-gate' \| 'consistency-check' \| 'pre-commit'` |
| TriggerCondition | `'pull_request' \| 'schedule' \| 'pre-commit'` |
| LessonCategory | `'anti-pattern' \| 'best-practice' \| 'edge-case'` |
| EscalationLogLevel | `'warn' \| 'error'` |
| PointerType | `'command' \| 'file'` |
| CommandPointer | `{ type: 'command', key: string, command: string, description: string }` |
| FilePointer | `{ type: 'file', key: string, filePath: string, description: string }` |
| HarnessErrorCode | Shared Kernel（harness-error）からインポート |
| PresetId | Shared Kernel（config-foundation）からインポート |
| ValidatorId | Cross-Unit Contract（validator-system）からインポート |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| TemplateGenerator | PresetId → TemplateConfig導出。CiTemplate集約の構築を補助。`generateConfig(presetId: PresetId): Result<TemplateConfig, HarnessError[]>` | ValidatorIdRegistryPort, PresetConfigPort |
| RepetitionDetector | HarnessError発生時に対象ErrorRepetition集約を取得・increment・escalation判定・save。`detect(error: HarnessError): Promise<EscalationAction \| null>` | ErrorRepetitionRepositoryPort |
| PointerValidator | PointerEntry参照先の実在性検証（Dead Pointer検出）。`validate(entries: PointerEntry[]): Promise<HarnessError[]>` | CommandExistencePort, FileExistencePort, AdrExistencePort |
| LessonAggregator | LessonArtifact[] → PointerEntry[]への変換（AGENTS.md集約形式へのマッピング）。重複lessonId検出。`aggregate(artifacts: LessonArtifact[]): Result<PointerEntry[], HarnessError[]>` | LessonArtifactReaderPort |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用サービス/集約 |
|---------|------|-----------------|
| ValidatorIdRegistryPort | validator-systemのValidator ID Registryから有効なValidatorId一覧取得 | TemplateGenerator |
| PresetConfigPort | config-foundationのPreset設定取得（PresetId → Preset設定） | TemplateGenerator |
| ErrorRepetitionRepositoryPort | `.harness/error-history.json`のCRUD（ErrorRepetition集約のload/save） | RepetitionDetector |
| CommandExistencePort | harness-apiのCLI Command Registryでコマンド実在性確認 | PointerValidator |
| FileExistencePort | ファイルシステムのファイル実在性確認 | PointerValidator |
| AgentsMdPort | AGENTS.mdのread/write（AgentsMdPointer集約の永続化） | アプリケーション層 |
| LessonArtifactReaderPort | skill-qualityのlesson artifact読み取り（LessonAggregator用） | LessonAggregator |
| AdrExistencePort | adr-foundationのADR実在性確認（AgentsMdPointer.adrLinks検証用） | PointerValidator |

### 出力ポート（ドメイン→外部）

| ポート名 | 責務 | 利用サービス/集約 |
|---------|------|-----------------|
| TemplateRendererPort | TemplateConfigに基づくYAMLテンプレートファイル書き出し | アプリケーション層（TemplateGenerator経由） |
| EscalationExecutorPort | EscalationAction（VO）に基づくログ出力・警告メッセージ実行 | アプリケーション層（RepetitionDetector経由） |

---

## 5. Domain Rules and Invariants

### 不変条件

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | CiTemplate | `templateType` は `'aidlc-gate' \| 'consistency-check' \| 'pre-commit'` の3種のいずれかであること |
| INV-2 | CiTemplate | `TemplateConfig.targetValidatorIds` は1件以上であること（空リストは不正） |
| INV-3 | CiTemplate | `TemplateConfig.targetValidatorIds` の全IDがValidator ID Registry上の有効なIDであること（ValidatorIdRegistryPortで検証） |
| INV-4 | CiTemplate | `presetRef`が参照するPresetは`TemplateConfig.targetValidatorIds`を包含していること（PresetConfigPortで検証） |
| INV-5 | ErrorRepetition | `occurrenceCount` は0以上の整数であること（負値は不正） |
| INV-6 | ErrorRepetition | `escalated=true` の場合、`occurrenceCount >= threshold` であること |
| INV-7 | ErrorRepetition | `reset()` は `escalated=true` かつ `RepetitionResetCondition` 成立時のみ呼び出し可能 |
| INV-8 | AgentsMdPointer | `PointerEntry[].key` はすべて一意であること（重複key禁止） |
| INV-9 | AgentsMdPointer | `validate()` を通過したAgentsMdPointerはDead Pointerを含まないこと（全PointerEntryの参照先が実在する） |
| INV-10 | AgentsMdPointer | `adrLinks` が参照するADRはadr-foundationのADR Frontmatter Schema上に存在すること（AdrExistencePortで検証） |
| INV-11 | PointerEntry | `FilePointer.filePath` はプロジェクトルートからの相対パス形式であること |
| INV-12 | LessonArtifact | `lessonId` はUUID形式の一意識別子であること |

### ErrorRepetition状態遷移

```
[初期状態]
  occurrenceCount = 0
  escalated = false
       |
       | 同一エラーコード発生（1回目・2回目）
       v
increment()
  occurrenceCount = 1, 2
  escalated = false
       |
       | 同一エラーコード発生（3回目: threshold=3に到達）
       v
increment()
isEscalated() → true
  occurrenceCount = 3 (>= threshold)
  escalated = true
       |
       | EscalationAction発動
       | → EscalationExecutorPort: ログ出力（logLevel: 'warn' | 'error'）
       | → messageTemplateに基づく警告メッセージ表示
       |
       | RepetitionResetCondition成立（resetOnResolution=true: 手動解決確認）
       v
reset()
  occurrenceCount = 0
  escalated = false
  ↑ 初期状態に戻る

※ threshold未満でincrementが繰り返されても escalated=false を維持
※ reset()はescalated=falseの状態では呼び出し不可（INV-7）
※ 同一エラーコードのErrorRepetitionインスタンスはErrorRepetitionRepositoryPortで一意に管理
```

### LessonAggregatorの重複検出ルール

LessonAggregatorは受け取ったLessonArtifact[]を処理する際、`lessonId` による同一性判定を行う。

| ルール | 内容 |
|--------|------|
| 同一性の基準 | `lessonId`（UUID）が同じものは同一のlesson artifactとして扱う |
| 重複検出 | 既にAgentsMdPointerに集約済みの`lessonId`を持つartifactは上書き対象（新しいtimestampのものを採用） |
| 新規追加 | 未集約の`lessonId`のみ新規PointerEntryとして追加する |
| エラー扱い | 同一バッチ内に同じ`lessonId`が複数存在する場合はHarnessError（DUPLICATE_LESSON_ID）として返す |
| タグ集約 | 同一`lessonId`の複数バージョンがある場合、`tags`はマージ（和集合）して保持する |

### AgentsMdPointer行数削減KPI

H13-03の受け入れ基準「ポインタ型移行後50%以上削減」の計測基準：

| 指標 | 内容 |
|------|------|
| 計測対象 | AGENTS.mdの全行数（コメント行・空行を含む） |
| 計測タイミング | ポインタ型移行前後のスナップショット比較 |
| 達成基準 | 移行後行数 ≦ 移行前行数 × 0.5 |
| 検証方法 | PointerEntryへの変換後にAgentsMdPortがwrite前後の行数をログ出力 |

---

## 6. Data Flow

### H13-01（CI/CDテンプレート生成）

```
[アプリケーション層: GenerateCiTemplateUseCase]
  引数: presetId: PresetId, templateType: TemplateType
       |
       v
TemplateGenerator.generateConfig(presetId)
  PresetConfigPort → PresetId → Preset設定取得
  ValidatorIdRegistryPort → 有効なValidatorId一覧取得
  Preset設定 + Validator ID Registry → TemplateConfig（VO）導出
    targetValidatorIds: Preset対応ValidatorId[]
    triggerCondition: templateTypeに対応するTriggerCondition
      ('aidlc-gate' → 'pull_request', 'consistency-check' → 'schedule', 'pre-commit' → 'pre-commit')
    failOnWarning: Preset設定から取得
  → Result<TemplateConfig, HarnessError[]>
       |
       v
CiTemplate.create(templateType, presetRef)
  → CiTemplate（初期状態）
CiTemplate.withConfig(templateConfig)
  → CiTemplate（設定注入済み）
  → validate()で不変条件チェック（INV-1〜INV-4）
  → 違反があればHarnessError[]を返す
       |
       v
[infrastructure層]
  TemplateRendererPort.render(ciTemplate)
  → templateTypeに応じたYAMLテンプレート生成
    'aidlc-gate'        → .github/workflows/aidlc-gate.yml
    'consistency-check' → .github/workflows/consistency-check.yml
    'pre-commit'        → .husky/pre-commit
```

### H13-02（反復エラー検出・エスカレーション）

```
[アプリケーション層: DetectErrorRepetitionUseCase]
  引数: error: HarnessError
       |
       v
RepetitionDetector.detect(error)
  ErrorRepetitionRepositoryPort.findByCode(error.code)
  → ErrorRepetition存在なし: ErrorRepetition.create(error.code, threshold=3)
  → ErrorRepetition存在あり: 既存インスタンス取得
       |
       v
ErrorRepetition.increment()
  occurrenceCount++
  isEscalated(): occurrenceCount >= threshold ?
  → true:  escalated = true → EscalationAction発動
  → false: escalated = false のまま
       |
       v
ErrorRepetitionRepositoryPort.save(errorRepetition)
→ .harness/error-history.json に永続化
       |
       v（escalated=true の場合のみ）
→ EscalationAction（VO）をアプリケーション層に返す
  アプリケーション層: EscalationExecutorPort.execute(escalationAction)
  → logLevelに応じたログ出力
  → messageTemplateに基づく警告メッセージ表示

[リセットフロー]
  RepetitionResetCondition成立（手動解決確認後）
  ErrorRepetition.reset()
  → occurrenceCount=0, escalated=false
  ErrorRepetitionRepositoryPort.save(errorRepetition)
```

### H13-03（AGENTS.mdポインタ型移行 + lesson artifact集約）

```
[アプリケーション層: MigrateAgentsMdUseCase]
  ─── フェーズ1: lesson artifact集約 ───
  LessonArtifactReaderPort.readAll()
  → LessonArtifact[]取得（skill-quality出力）
       |
       v
LessonAggregator.aggregate(artifacts)
  重複lessonId検出（同一バッチ内のUUID重複チェック）
  → 重複あり: HarnessError（DUPLICATE_LESSON_ID）
  → 重複なし: LessonArtifact[] → PointerEntry[]変換
       |
  ─── フェーズ2: AGENTS.md読み取り ───
  AgentsMdPort.read()
  → AgentsMdPointer（既存ポインタ構造）
       |
       v
AgentsMdPointer.addPointer(pointerEntry) × N
  → INV-8チェック（key一意性）
AgentsMdPointer.validate()
  PointerValidator経由で実在性検証
    CommandExistencePort: CommandPointerのcommand実在確認
    FileExistencePort: FilePointerのfilePath実在確認
    AdrExistencePort: adrLinksのADR実在確認
  → Dead Pointer検出時: HarnessError（DEAD_POINTER）
       |
       v（バリデーション通過）
AgentsMdPort.write(agentsMdPointer)
  → AGENTS.md書き込み（行数削減KPI計測）
  → 移行前後行数ログ出力

[行数KPIチェック]
  移行後行数 ≦ 移行前行数 × 0.5 → 受け入れ基準達成
  移行後行数 > 移行前行数 × 0.5 → HarnessError（KPI_NOT_MET）として警告
```

---

## 7. LessonArtifact Schema

### TypeScript型定義（ドメイン層所有）

```typescript
// ci-governance/domain/types/lesson-artifact.ts

/**
 * LessonArtifact: skill-qualityが出力するlesson artifactの型定義
 * Schema Owner: ci-governance Unit
 * Cross-Unit Contract: docs/contracts/lesson-artifact.schema.json
 *
 * skill-qualityはこのスキーマに準拠してartifactを出力する（下流消費者）
 */
export type LessonCategory = 'anti-pattern' | 'best-practice' | 'edge-case';

export interface LessonArtifact {
  /** UUID形式の一意識別子（INV-12: UUID形式必須） */
  lessonId: string;
  /** lesson artifactの出力元スキル名（例: 'story-implementor', 'domain-designer'） */
  source: string;
  /** AGENTS.mdに集約するlesson内容テキスト */
  content: string;
  /** lessonのカテゴリタグ（重複集約時はマージされる） */
  tags: LessonCategory[];
  /** artifact作成日時（ISO 8601形式） */
  timestamp: string; // ISO8601DateString
}
```

### JSONスキーマ配置先

| 項目 | 内容 |
|------|------|
| 配置先 | `docs/contracts/lesson-artifact.schema.json` |
| $schema | `https://json-schema.org/draft/2020-12` |
| $id | `lesson-artifact` |
| 消費Unit | skill-quality（LessonArtifactReaderPortが実装時に参照） |
| バリデーション方式 | skill-qualityはci-governanceドメイン層の型をインポートせず、JSONスキーマ経由でバリデーションを行う |
| 更新ルール | スキーマ変更時はci-governanceが所有者としてバージョン管理。skill-qualityはスキーマ変更通知を受けて対応 |

---

## 8. 設計判断記録

### D1: CiTemplate集約は永続化なし（リポジトリポートなし）

テンプレートの「仕様設定」（どのバリデータを実行するか等）はHarnessConfigV2（config-foundation）またはPreset設定から都度導出可能であるため、CiTemplate集約のメモリ外への永続化は不要と判断した。生成のたびにPreset設定 → TemplateConfigを導出し、CiTemplateを構築してTemplateRendererPortに渡す設計とする。これによりドメイン層のstate管理コストを最小化し、「仕様宣言」としての役割を純粋に保つ。

### D2: RepetitionDetectorはErrorRepetitionRepositoryPortを直接注入するドメインサービス

RepetitionDetectorがErrorRepetitionのload/save（リポジトリ相当の操作）を行うにあたり、ドメインサービスがポートのインターフェースに依存することはクリーンアーキテクチャの範囲内（依存の方向はドメイン→インフラ方向への逆転なし）と判断した。ErrorRepetitionRepositoryPortをコンストラクタ注入で受け取ることで、インフラ実装（`.harness/error-history.json`操作）とドメインロジック（threshold判定・状態遷移）を分離する。

### D3: AgentsMdPointerのファイルI/OをAgentsMdPortに完全委譲

AgentsMdPointer集約はAGENTS.mdの内容をメモリ上で保持する（ファイルI/Oは担わない）。PointerValidatorドメインサービスはFileExistencePort・CommandExistencePort・AdrExistencePortという3つのポートをコンストラクタ注入で受け取り、実在性検証を行う。これによりドメインサービスはファイルシステムへの直接依存を持たず、テスタビリティを確保する。

### D4: LessonArtifact SchemaをJSONスキーマとして公開するCross-Unit Contract方針

LessonArtifact TypeScript型はci-governanceドメイン層が所有するが、skill-qualityはci-governanceドメイン層を直接インポートしない。代わりに`docs/contracts/lesson-artifact.schema.json`として公開されるJSONスキーマを参照して検証する。これによりUnit間の直接型依存を排除し、スキーマバージョン管理を独立して行える設計とする。

### D5: EscalationAction（VO）は宣言的定義のみを保持

EscalationAction（VO）は`logLevel`（warn/error）と`messageTemplate`（string）の2フィールドで構成されるシンプルなVOとし、実際のアクション実行（ログ出力・警告メッセージ表示）はEscalationExecutorPort（インフラ層）に委譲する。RepetitionDetectorがescalated=trueを検出したらEscalationAction（VO）をアプリケーション層に返し、アプリケーション層がEscalationExecutorPortに渡す構成とする。

### D6: TemplateType × TriggerConditionのマッピングをTemplateGenerator責務とする

`templateType` と `triggerCondition` の対応（aidlc-gate→pull_request、consistency-check→schedule、pre-commit→pre-commit）はTemplateGenerator内のドメインロジックとして実装する。この対応関係はCI/CDパイプライン設計の業務知識であり、Preset設定に依存しない固定ルールとして扱う。

### D7: PointerEntry.keyによる一意性管理

AgentsMdPointer内のPointerEntryはPointerType（command/file）に依存しない`key`フィールドで一意性を管理する。これによりCommandPointerからFilePointerへの種別変更（リファクタリング）をkey保持のまま行えるようにする。

---

## 9. 品質評価（engineering-perspective）

### ドメインスメルチェック

- **責務混在**: RepetitionDetectorはErrorRepetitionRepositoryPortを通じたload/saveのみを行い、永続化フォーマット（JSON構造）はインフラ層に委譲 → 問題なし
- **不適切なVO**: EscalationActionの実行責務をEscalationExecutorPortに委譲し、VOは宣言的定義のみ保持 → 正当な判断
- **言語の乖離**: CiTemplate/ErrorRepetition/AgentsMdPointerはCI/CD・エラー管理・AGENTS.md管理のユビキタス言語に準拠 → 問題なし
- **境界不明確**: skill-qualityとの境界はLessonArtifact SchemaのJSONスキーマで明確化。直接型依存なし → 境界明確
- **Dead Pointer禁止の強制**: AgentsMdPointer.validate()がINV-9を強制し、PointerValidatorドメインサービスが実在性検証を担う → 不変条件の適切な分担

### SOLID評価

- **SRP**: TemplateGeneratorがテンプレート設定導出、RepetitionDetectorがエラー繰り返し管理、PointerValidatorが実在性検証、LessonAggregatorがlesson集約にそれぞれ単一化 → 遵守
- **OCP**: TemplateTypeへの新種別追加はTemplateGenerator内のマッピングと対応するTemplateRendererPort実装の追加のみで対応可能 → 拡張に開いている
- **依存方向**: ドメイン層がポートを定義し、infrastructure層がPortを実装（外向き依存） → 遵守
- **インターフェース分離**: ValidatorIdRegistryPort/PresetConfigPort/ErrorRepetitionRepositoryPort/CommandExistencePort/FileExistencePort/AgentsMdPort/LessonArtifactReaderPort/AdrExistencePortが責務別に適切に分離 → 遵守

### シンプルさ評価

- 3集約・4ドメインサービス・5VO という関心領域に対して適切な規模の構成
- CiTemplate集約の永続化なし設計により、リポジトリポートを1つ削減（ErrorRepetitionRepositoryPortのみ）
- LessonAggregatorがポート依存なし（VO変換のみ）でテスタビリティが高い
- TemplateType × TriggerConditionのマッピングをTemplateGenerator内に閉じ込めることで、条件分岐をドメイン層に集中

### リスク評価

| リスク | 評価 | 対応方針 |
|--------|------|---------|
| validator-system依存（Wave 2未確定） | 中 | ValidatorIdRegistryPortをインターフェースとして定義し、モック実装でWave 2 Step 1開発を進める |
| harness-api依存（Wave 2 Step 2未確定） | 中 | CommandExistencePortをインターフェースとして定義し、Wave 2 Step 2での実装差し込みに備える |
| AGENTS.md行数50%削減KPI未達 | 低 | H13-03実装前に現行AGENTS.mdの行数をスナップショット記録し、KPI計測を自動化する |
| `.harness/error-history.json`スキーマ進化 | 低 | ErrorRepetitionRepositoryPort実装がスキーマバージョン管理を担い、ドメイン集約への影響を遮断する |

**評価結果**: 問題なし。設計を確定する。

---

## 10. WI-032: AgentContextRefresh

<!-- @work-item-id WI-032 -->

### 10.1 新しいドメイン概念

| 概念 | 種別 | 責務 |
|---|---|---|
| AgentContextRefresh | UseCase boundary | AGENTS.md pointer 更新と CLAUDE.md 標準セクション更新をまとめる |
| ClaudeMdDocument | 文書モデル | 標準セクションと user-owned section の境界を保持する |
| AgentContextFreshness | 検査結果 | AGENTS.md / CLAUDE.md の存在と更新鮮度を表す |

### 10.2 不変条件

- CLAUDE.md 更新では user-owned section marker 内の内容を破壊しない。
- `--dry-run` は AGENTS.md / CLAUDE.md / workflow を書き換えない。
- `--apply` は Dead Pointer 検証に失敗した場合、AGENTS.md を更新しない。
- bundled template は npm package に含める。

### 10.3 skill-quality との境界

skill-quality は lesson artifact を出力するだけで、AGENTS.md / CLAUDE.md を直接更新しない。ci-governance は lesson artifact を読み取り、AGENTS.md pointer へ集約する consumer として振る舞う。
