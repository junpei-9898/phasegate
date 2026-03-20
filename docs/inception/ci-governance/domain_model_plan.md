# ドメインモデル設計計画: ci-governance

> **作成日**: 2026-03-19
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: ci-governance（H-13 Scheduled Governance & CI/CDテンプレート）
> **担当ストーリー**: H13-01〜H13-03

---

## 1. スコープ

- **対象Unit**: ci-governance
- **担当ストーリー**:
  - H13-01: CI/CDテンプレート生成（`aidlc-gate.yml` / `consistency-check.yml` / `.husky/pre-commit`）
  - H13-02: 反復エラー自動エスカレーション（同一HarnessError code が 3回以上で検出・エスカレーション）
  - H13-03: AGENTS.mdポインタ型移行（行数50%以上削減 + skill-quality lesson artifact集約）
- **他Unitとの境界**:
  - harness-error: HarnessError型・エラーコードをShared Kernelとして消費（ErrorRepetitionの繰り返し検出対象）
  - config-foundation: HarnessConfigV2からPreset ID / テンプレート設定を消費。Preset ID Registry参照
  - adr-foundation: ADR Frontmatter Schemaを消費（AgentsMdPointerのadrLinksバリデーション）
  - validator-system: Validator ID Registryを消費（TemplateConfigのバリデータ実行設定参照）
  - harness-api: Harness API Response DTO・CLI Command Registryを消費
  - skill-quality: 本UnitはLessonArtifact Schemaのオーナー。skill-qualityがそのSchemaに準拠してartifactを出力する（下流への提供）

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| CiTemplate | H13-01 | ※集約評価対象（後述） |
| ErrorRepetition | H13-02 | ※集約評価対象（後述） |
| AgentsMdPointer | H13-03 | ※集約評価対象（後述） |
| TemplateConfig | H13-01 | 値オブジェクト（テンプレートごとのバリデータ実行設定） |
| EscalationAction | H13-02 | 値オブジェクト（エスカレーション時のアクション定義） |
| RepetitionResetCondition | H13-02 | 値オブジェクト（エラー繰り返しカウントのリセット条件） |
| PointerEntry | H13-03 | 値オブジェクト（個別ポインタ定義: command/file） |
| LessonArtifact | H13-03 | 値オブジェクト（skill-qualityが出力するlesson artifact。本Unitがスキーマオーナー） |
| TemplateGenerator | H13-01 | ドメインサービス（Preset設定からテンプレート設定を導出） |
| RepetitionDetector | H13-02 | ドメインサービス（HarnessError発生履歴管理・閾値判定） |
| PointerValidator | H13-03 | ドメインサービス（ポインタ参照先の実在性検証） |
| LessonAggregator | H13-03 | ドメインサービス（lesson artifact → AGENTS.md集約） |

### 集約候補1: CiTemplateの評価

Unit定義§4では `CiTemplate` を**集約ルート候補**と記載している。横断契約§6の集約降格方針に照らして検討する。

**集約ルートとして維持する根拠**:
- templateType（`aidlc-gate` / `consistency-check` / `pre-commit`）とtargetLayers・presetRefという複数フィールドの整合性（例: presetRefが指すPresetはtargetLayersを包含していること）を保証する責務がある
- テンプレート「仕様の宣言」として機能し、どのバリデータ（TemplateConfig）を実行するかという設定を内包する
- TemplateGeneratorが導出した TemplateConfig（VO）を CiTemplate に組み込む操作はドメインロジックであり、純粋なVOでは状態と整合性を表現できない

**集約ルートにしない根拠（降格検討）**:
- 生成後のファイル（YAMLテンプレート）自体はインフラ層の出力物であり、CiTemplateドメインオブジェクトは「仕様宣言」に留まる
- CiTemplateインスタンスの永続化（ファイル保存）自体はTemplateRendererPort（インフラ層）が担う
- CiTemplateそのものに厳格な識別子（ID）による追跡や複数インスタンス間の整合性管理は不要（templateTypeが一意に識別する）

**結論**: CiTemplateは**集約ルート**として採用する。templateTypeを識別子とし、TemplateConfig（VO）を内包する。テンプレートファイルへの書き出しはTemplateRendererPortに委譲し、ドメイン層は「どの設定でどのテンプレートを生成すべきか」という仕様のみを保持する。

### 集約候補2: ErrorRepetitionの評価

Unit定義§4では `ErrorRepetition` を**集約ルート候補**と記載している。横断契約§6の集約降格方針に照らして検討する。

**集約ルートとして維持する根拠**:
- `occurrenceCount`（繰り返し回数）という状態を持ち、`increment()` → `isEscalated()` → `reset()` という明確な状態遷移ライフサイクルがある
- エラーコード（`code`）ごとにインスタンスが存在し、永続化が必要（`.harness/error-history.json`）
- `threshold`（デフォルト3回）との比較による`escalated`フラグ遷移はビジネスルールであり、集約内に閉じ込める責務がある
- EscalationAction（VO）・RepetitionResetCondition（VO）を内包し、これらの整合性を保証する

**集約ルートにしない根拠（降格検討）**:
- RepetitionDetector（ドメインサービス）がリポジトリ相当の操作（複数 ErrorRepetition の横断検索）を行う可能性があるため、サービスとエンティティの責務分離が重要

**RepetitionDetectorとErrorRepetitionの関係の解決**:
- ErrorRepetition集約はコードごとの「状態と不変条件の保証」を担う（単一集約の整合性）
- RepetitionDetectorはドメインサービスとして「全エラーコードの横断的な発生履歴管理・特定コードのErrorRepetition集約への操作ルーティング」を担う
- リポジトリ操作（ErrorRepetitionのload/save）はErrorRepetitionRepositoryPort（インフラ層）に委譲

**結論**: ErrorRepetitionは**集約ルート**として採用する。codeを識別子とし、EscalationAction・RepetitionResetCondition（VO）を内包。永続化はErrorRepetitionRepositoryPortに委譲。RepetitionDetectorはドメインサービスとして複数集約への操作調整を担う。

### 集約候補3: AgentsMdPointerの評価

Unit定義§4では `AgentsMdPointer` を**集約ルート候補**と記載している。横断契約§6の集約降格方針に照らして検討する。

**集約ルートとして維持する根拠**:
- AGENTS.mdというファイルI/O境界がある（読み取り元かつ書き込み先）
- pointers一覧全体の整合性として「Dead Pointer禁止」（参照先が実在しないポインタを許容しない）という不変条件をドメイン層で保証する責務がある
- PointerEntry（VO）の追加・削除・検証という操作はAgentsMdPointerの整合性責務を持つ集約が統括すべき
- adrLinks（ADR参照リスト）との整合性（参照するADRが存在すること）も集約内で管理する

**集約ルートにしない根拠（降格検討）**:
- AgentsMdPointerは単一ファイル（AGENTS.md）に対応する単一インスタンスであり、複数インスタンス間の整合性管理は不要

**結論**: AgentsMdPointerは**集約ルート**として採用する。pointers（PointerEntry[]）とadrLinks（string[]）を内包し、Dead Pointer禁止の不変条件を保証。ファイルI/OはAgentsMdPortに委譲。PointerValidatorドメインサービスが実在性検証を担い、その結果を集約に反映する。

### 全体構成の結論: 集約3つ + ドメインサービス4つ

ci-governanceは3つの独立した関心領域（CI/CDテンプレート管理・エラーエスカレーション・AGENTS.md管理）を統括するUnitであり、それぞれに明確なI/O境界とライフサイクルを持つ集約ルートが適切な構成となる。

---

## 3. 設計方針

### 3.1 集約3つを中心とした構成

```
[H13-01: CI/CDテンプレート生成]
  TemplateGenerator（ドメインサービス）
    Preset設定（config-foundation）→ TemplateConfig（VO）導出
  CiTemplate（集約ルート）
    templateType: 'aidlc-gate' | 'consistency-check' | 'pre-commit'
    targetLayers: LayerSpec[]
    presetRef: PresetId
    config: TemplateConfig（VO）
    ├── withConfig(config): CiTemplate
    └── validate(): HarnessError[]
  → TemplateRendererPort（インフラ層）でYAMLファイル書き出し

[H13-02: 反復エラー自動エスカレーション]
  RepetitionDetector（ドメインサービス）
    HarnessError入力 → 対象ErrorRepetition集約へのルーティング
  ErrorRepetition（集約ルート）
    code: HarnessErrorCode（識別子）
    occurrenceCount: number
    threshold: number（デフォルト3）
    escalated: boolean
    escalationAction: EscalationAction（VO）
    resetCondition: RepetitionResetCondition（VO）
    ├── increment(): void
    ├── isEscalated(): boolean
    └── reset(): void
  → ErrorRepetitionRepositoryPort（インフラ層）で .harness/error-history.json 読み書き

[H13-03: AGENTS.mdポインタ型移行]
  PointerValidator（ドメインサービス）
    PointerEntry参照先の実在性検証（ファイル/コマンドの存在確認）
  LessonAggregator（ドメインサービス）
    LessonArtifact[]（skill-quality出力）→ AGENTS.md集約形式に変換
  AgentsMdPointer（集約ルート）
    pointers: PointerEntry[]（VO）
    adrLinks: AdrReference[]
    ├── addPointer(entry): Result<void, HarnessError>
    ├── removePointer(key): Result<void, HarnessError>
    └── validate(): HarnessError[]（Dead Pointer禁止チェック）
  → AgentsMdPort（インフラ層）でAGENTS.mdファイル読み書き
```

### 3.2 CiTemplateの型設計

CiTemplateのtemplateTypeをUnion型として定義し、型安全なテンプレート種別管理を行う:

```
templateType =
  | 'aidlc-gate'         // GitHub Actions: Harnessゲートチェック
  | 'consistency-check'  // GitHub Actions: 整合性チェック
  | 'pre-commit'         // Husky: コミット前フック

TemplateConfig {
  validatorIds: ValidatorId[]    // 実行するバリデータID（validator-system参照）
  targetLayers: LayerSpec[]      // 対象レイヤー（domain/application/infrastructure/presentation）
  failOnWarning: boolean         // 警告をエラーとして扱うか
}
```

### 3.3 ErrorRepetitionのライフサイクル

```
[初期状態: occurrenceCount=0, escalated=false]
    ↓ 同一エラーコード発生（1回目・2回目）
increment()
[occurrenceCount=1, 2]
    ↓ 同一エラーコード発生（3回目: threshold到達）
increment()
isEscalated() → true
[escalated=true → EscalationAction発動]
    ↓ EscalationAction: CI失敗・通知・チケット生成等
    ↓ RepetitionResetCondition成立（手動確認・修正等）
reset()
[occurrenceCount=0, escalated=false に戻る]
```

RepetitionDetectorはErrorRepetitionRepositoryPortから対象コードの集約を取得し、increment()を呼び出してから保存する。集約が存在しない場合は新規生成する。

### 3.4 AgentsMdPointerのポインタ型設計

PointerEntryをポインタ種別ごとのUnion型として定義する:

```
PointerEntry =
  | CommandPointer { type: 'command', key: string, command: string, description: string }
  | FilePointer   { type: 'file',    key: string, filePath: string, description: string }

AdrReference {
  adrId: string          // ADR識別子（adr-foundation参照）
  description: string
}
```

Dead Pointer禁止の不変条件: CommandPointerのcommandが実行可能、FilePointerのfilePathが存在するファイルを参照していること。PointerValidatorが実在性を検証し、AgentsMdPointer.validate()がその結果を返す。

### 3.5 LessonArtifact Schemaの所有戦略

本UnitはLessonArtifact Schemaのオーナーとして、ドメイン層にLessonArtifact型を定義する。skill-qualityはこのSchemaに準拠してartifactを出力する（下流消費者）。

```
LessonArtifact {
  lessonId: string             // 一意識別子
  skillName: string            // 関連するスキル名
  category: LessonCategory     // 'anti-pattern' | 'best-practice' | 'edge-case'
  summary: string              // AGENTS.mdに集約する要約テキスト
  pointerKey: string           // 対応するPointerEntryのkeyを示す（任意）
  createdAt: ISO8601DateString
}
```

LessonAggregatorは受け取ったLessonArtifact[]を解析し、AgentsMdPointerのpointers（PointerEntry[]）に集約されたエントリとして変換する。

### 3.6 テンプレート生成とPreset連動の方針

H13-01のCI/CDテンプレートはPreset設定（config-foundation）に連動して生成される。TemplateGeneratorがPresetId → TemplateConfig変換を担い、CiTemplate集約に設定を注入する。

```
TemplateGenerator.generateConfig(presetId: PresetId): Result<TemplateConfig, HarnessError[]>
  → PresetQueryPort（config-foundation経由）でPreset設定取得
  → Preset設定に基づいてvalidatorIds / targetLayers / failOnWarning を決定
  → TemplateConfig（VO）として返す

CiTemplate.withConfig(config: TemplateConfig): CiTemplate
  → 設定が注入された新しいCiTemplateを返す（イミュータブル）
```

---

## 4. QA（設計判断の根拠）

### Q1: CiTemplateはドメイン層での永続化が必要か

**質問**: CiTemplateの「仕様宣言」はHarnessConfigV2に含まれているのか、それともCiTemplate集約として独立して永続化すべきか？

**推奨案**: CiTemplate集約はメモリ上でのみ存在し、永続化はしない。テンプレートの「仕様設定」（どのバリデータを実行するか等）はHarnessConfigV2（config-foundation）またはPreset設定から都度導出する。TemplateGeneratorが生成のたびにPreset設定→TemplateConfigを導出し、CiTemplateを構築してTemplateRendererPortに渡す。したがって、CiTemplate集約に専用のリポジトリポートは不要。

**結論**: CiTemplate集約は永続化なし（リポジトリポートなし）。生成のたびにPreset設定から再構築する。TemplateRendererPortがYAMLファイル書き出しのみを担う。

### Q2: RepetitionDetectorはドメインサービスか、それともErrorRepetition集約のファクトリか

**質問**: RepetitionDetectorがErrorRepetitionをload/save（リポジトリ相当の操作）を行うとすると、ドメインサービスがポートを直接操作することになる。これはクリーンアーキテクチャの観点で問題ないか？

**推奨案**: RepetitionDetectorドメインサービスはErrorRepetitionRepositoryPort（インターフェース）を依存注入で受け取り、load/saveを通じてErrorRepetition集約を操作する。ドメインサービスがポートのインターフェースに依存することはクリーンアーキテクチャの範囲内（依存の方向はドメイン→インフラ方向への逆転なし）。実際のファイルI/OはインフラのErrorRepetitionRepositoryPort実装が担う。

**結論**: RepetitionDetectorはErrorRepetitionRepositoryPortをコンストラクタ注入で受け取るドメインサービスとして実装。detect(error: HarnessError): Promise<EscalationAction | null> というインターフェースをアプリケーション層に提供する。

### Q3: AgentsMdPointerはファイルI/Oをどこで行うか

**質問**: AGENTS.mdの読み取り・書き込みはドメイン層（集約）が担うのか、それともインフラ層のポートに完全に委譲するのか？ポインタの実在性検証（PointerValidator）はファイルシステム参照が必要だが、ドメインサービスに置いてよいか？

**推奨案**: AgentsMdPointer集約はAGENTS.mdの内容をメモリ上で保持する（ファイルI/Oは担わない）。ファイルの読み取り・書き込みはAgentsMdPort（インフラ層）が担う。PointerValidatorドメインサービスはFileExistencePort・CommandExistencePortという2つのポートを依存注入で受け取り、実在性検証を行う。これにより、ドメインサービスはファイルシステムへの直接依存を持たない。

**結論**: AgentsMdPortでファイルI/Oを分離。PointerValidatorはFileExistencePort・CommandExistencePortをコンストラクタ注入で受け取る。

### Q4: LessonArtifact SchemaはどのLayerに配置するか

**質問**: LessonArtifact型のスキーマ定義（JSONスキーマおよびTypeScript型）はどのレイヤーに配置するか？skill-qualityがそれを消費するが、スキーマを別パッケージに切り出すべきか？

**推奨案**: LessonArtifact型はci-governanceのドメイン層（`domain/types/lesson-artifact.ts`）に定義する。skill-qualityはci-governanceのドメイン型を直接インポートするのではなく、`scripts/harness/ci-governance/domain/schemas/lesson-artifact.schema.json` として公開されるJSONスキーマを参照して検証する。TypeScript型はci-governance内のドメイン層でのみ使用し、skill-qualityはJSONスキーマ経由でバリデーションを行う。

**結論**: LessonArtifact TypeScript型はci-governanceドメイン層が所有。公開インターフェースはJSONスキーマとして`docs/contracts/lesson-artifact.schema.json`に配置し、skill-qualityが参照するCross-Unit Contractとする。

### Q5: EscalationActionのVOとしての表現

**質問**: EscalationAction（VO）は「エスカレーション時のアクション定義」だが、実際のアクション実行（CI失敗コード送出・通知等）はどこが担うか？

**推奨案**: EscalationAction（VO）はアクションの「種別と設定」（例: `{ type: 'fail-ci', message: '...' }` / `{ type: 'notify', channel: '...' }`）を宣言的に保持する。実際のアクション実行（プロセス終了・通知送出等）はEscalationExecutorPort（インフラ層）が担う。RepetitionDetectorがisEscalated()=trueを検出したらEscalationAction（VO）をアプリケーション層に返し、アプリケーション層がEscalationExecutorPortに渡す。

**結論**: EscalationAction（VO）は宣言的な定義のみを保持。実行はEscalationExecutorPort（インフラ層）に委譲する。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 | 利用主体 |
|--------|------|------|---------|
| TemplateRendererPort | ドメイン→外部 | TemplateConfigに基づくYAMLテンプレートファイル書き出し | TemplateGenerator（ドメインサービス）経由でアプリケーション層 |
| PresetQueryPort | 外部→ドメイン | PresetId → Preset設定取得（config-foundation参照） | TemplateGenerator（ドメインサービス） |
| ValidatorRegistryPort | 外部→ドメイン | Validator ID Registryから有効なValidatorId一覧取得（validator-system参照） | TemplateGenerator（ドメインサービス） |
| ErrorRepetitionRepositoryPort | 外部→ドメイン | `.harness/error-history.json` への ErrorRepetition集約のload/save | RepetitionDetector（ドメインサービス） |
| EscalationExecutorPort | ドメイン→外部 | EscalationAction（VO）に基づくCI失敗・通知等の実際の実行 | アプリケーション層 |
| AgentsMdPort | 外部→ドメイン | AGENTS.mdファイルの読み取り・書き込み | アプリケーション層 |
| FileExistencePort | 外部→ドメイン | ファイルパスの実在性確認 | PointerValidator（ドメインサービス） |
| CommandExistencePort | 外部→ドメイン | コマンドの実行可能性確認 | PointerValidator（ドメインサービス） |
| AdrQueryPort | 外部→ドメイン | ADR Frontmatter Schema参照・ADR存在確認（adr-foundation参照） | PointerValidator（ドメインサービス）、AgentsMdPointer集約 |

---

## 6. ドメインモデル概要

### 所有する集約

| 集約ルート | 識別子 | 内包するVO | 説明 |
|-----------|--------|-----------|------|
| CiTemplate | templateType | TemplateConfig | CI/CDテンプレートの仕様宣言。templateType・targetLayers・presetRef・configの整合性保証 |
| ErrorRepetition | code（HarnessErrorCode） | EscalationAction, RepetitionResetCondition | 同一エラーコードの繰り返し検出・閾値到達によるエスカレーション状態管理 |
| AgentsMdPointer | （単一インスタンス） | PointerEntry[], AdrReference[] | AGENTS.mdのポインタ型構造統括。Dead Pointer禁止の不変条件保証 |

### 所有する値オブジェクト

| 値オブジェクト | 説明 |
|-------------|------|
| TemplateConfig | テンプレートごとのバリデータ実行設定（validatorIds/targetLayers/failOnWarning） |
| EscalationAction | エスカレーション時のアクション定義（type/設定値の宣言的表現） |
| RepetitionResetCondition | エラー繰り返しカウントのリセット条件（手動確認済みフラグ等） |
| PointerEntry | 個別ポインタ定義（CommandPointer / FilePointerのUnion型） |
| AdrReference | ADR参照（adrId/description） |
| LessonArtifact | skill-qualityが出力するlesson artifact（スキーマオーナーは本Unit） |

### 所有するドメインサービス

| ドメインサービス | 依存ポート | 説明 |
|--------------|----------|------|
| TemplateGenerator | PresetQueryPort, ValidatorRegistryPort | PresetId → TemplateConfig導出。CiTemplate集約の構築を補助 |
| RepetitionDetector | ErrorRepetitionRepositoryPort | HarnessError発生時に対象ErrorRepetition集約を取得・increment・escalation判定・save |
| PointerValidator | FileExistencePort, CommandExistencePort, AdrQueryPort | PointerEntry参照先の実在性検証（Dead Pointer検出） |
| LessonAggregator | （ポート依存なし） | LessonArtifact[] → PointerEntry[]への変換（AGENTS.md集約形式へのマッピング） |

### 補助型

| 型 | 説明 |
|---|------|
| TemplateType | `'aidlc-gate' \| 'consistency-check' \| 'pre-commit'` |
| LessonCategory | `'anti-pattern' \| 'best-practice' \| 'edge-case'` |
| EscalationActionType | `'fail-ci' \| 'notify' \| 'create-ticket'` |
| PointerType | `'command' \| 'file'` |
| HarnessErrorCode | Shared Kernel（harness-error）からインポート |
| PresetId | Shared Kernel（config-foundation）からインポート |

---

## 7. 不変条件（予定）

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | CiTemplate | presetRefが参照するPresetはtargetLayersを包含していること（PresetQueryPortで検証） |
| INV-2 | CiTemplate | templateConfigのvalidatorIdsはすべてValidator ID Registry上の有効なIDであること |
| INV-3 | ErrorRepetition | occurrenceCountは0以上の整数（負値は不正） |
| INV-4 | ErrorRepetition | escalated=trueの場合、occurrenceCount >= threshold であること |
| INV-5 | ErrorRepetition | reset()はescalated=trueかつRepetitionResetCondition成立時のみ呼び出し可能 |
| INV-6 | AgentsMdPointer | pointers内のkeyはすべて一意であること（重複key禁止） |
| INV-7 | AgentsMdPointer | validate()を通過したAgentsMdPointerはDead Pointerを含まないこと |
| INV-8 | AgentsMdPointer | adrLinksが参照するADRはADR Frontmatter Schema上に存在すること |
| INV-9 | LessonArtifact | lessonIdはUUID形式の一意識別子であること |
| INV-10 | PointerEntry | FilePointerのfilePathはプロジェクトルートからの相対パス形式であること |

---

## 8. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 依存: harness-error | HarnessError型・HarnessErrorCodeの確定が前提。Wave 1で実装済み |
| 依存: config-foundation | HarnessConfigV2・Preset ID Registryの確定が前提。Wave 1で実装済み |
| 依存: adr-foundation | ADR Frontmatter Schemaの確定が前提。Wave 1で実装済み |
| 依存: validator-system | Validator ID Registryの確定が前提。harness-apiと合わせてWave 2での確定を想定 |
| 依存: harness-api | Harness API Response DTO・CLI Command Registryの確定が前提。Wave 2 Step 2での確定を想定 |
| 下流: skill-quality | LessonArtifact SchemaのCross-Unit Contractが確定するまで、skill-qualityのlesson artifact出力は実装着手不可。本Unitのドメイン層設計が先行する必要あり |
| リスク: ErrorRepetition永続化フォーマット | `.harness/error-history.json`のJSONスキーマはインフラ層の関心事だが、ErrorRepetition集約の識別子（HarnessErrorCode）との整合が必要。実装時にスキーマを明示的に定義すること |
| リスク: AGENTS.md行数50%削減の検証 | H13-03の受け入れ基準「行数50%以上削減」の計測基準（コメント行を含むか等）は実装前に明確化が必要 |
| リスク: PointerValidator実行コスト | コマンドの実行可能性確認（CommandExistencePort）はPATH参照を伴うため、CI環境と開発環境で挙動が異なる可能性がある。実装時にCI環境での動作を事前確認すること |
| リスク: テンプレートのPR/push時の自動更新 | H13-01のテンプレートがPreset設定変更時に自動再生成されるかどうかはH13-01の受け入れ基準で確認が必要。ドメインモデルはstateless生成として設計しているが、差分検出ロジックが必要であればインフラ層に追加が必要 |

---

## 9. 承認

- [ ] 人間承認済み（Phase 2着手許可）
