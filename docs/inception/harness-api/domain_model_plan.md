# ドメインモデル設計計画: harness-api

> **作成日**: 2026-03-19
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: harness-api（H-09 Harness API）
> **担当ストーリー**: H09-01〜H09-04

---

## 1. スコープ

- **対象Unit**: harness-api
- **担当ストーリー**:
  - H09-01: phasegate:check-ready / phasegate:check-phase
  - H09-02: phasegate:ci-check
  - H09-03: phasegate:detect-drift
  - H09-04: phasegate:status（成果物駆動状態導出）
  - （追加）phasegate:lint / phasegate:complete-check / phasegate:impact-analysis のCLIエントリポイント所有
- **他Unitとの境界**:
  - validator-system: ValidationResultを消費（ci-check/detect-drift/complete-check実行ロジック）
  - config-foundation: HarnessConfigV2からPreset・有効設定を参照（status表示）
  - nyquist-validation: ImpactAnalysisResultを消費（impact-analysisコマンド実行ロジック）
  - biome-ast-engine: lint実行ロジックの委譲先
  - harness-error: 全コマンドのエラーレスポンスにHarnessError型を使用
  - agent-integration: Harness API Response DTO・CLI Command Registryを消費
  - ci-governance: Harness API Response DTOを消費

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| CliCommand | 全ストーリー | ※集約降格評価対象（後述） |
| CommandRegistry | 全ストーリー | ドメインサービス（全CLIコマンドの一元管理・名前一意性保証） |
| HarnessApiResponse | 全ストーリー | 値オブジェクト（Cross-Unit Contract DTO。integration_contractに構造定義済み） |
| CheckReadyResult | H09-01 | 値オブジェクト（全storyのPhase Gate通過状態） |
| PhaseInfo | H09-01 | 値オブジェクト（指定Unitの現在フェーズ情報） |
| CiCheckResult | H09-02 | 値オブジェクト（L3バリデータ統合実行結果） |
| DriftReportSummary | H09-03 | 値オブジェクト（乖離レポートのCLI出力形式） |
| HarnessStatusSummary | H09-04 | 値オブジェクト（ハーネス全体健全性サマリー） |
| ArtifactScanResult | H09-04 | 値オブジェクト（成果物駆動の状態導出中間結果） |
| CommandDispatchService | 全ストーリー | ドメインサービス（CLIコマンドから実行ロジックへのディスパッチ） |
| ExitCode | 全ストーリー | 補助型（0: 正常/Pass、1: Fail/未検出、2: エラー） |
| CommandName | 全ストーリー | 補助型（コマンド識別子文字列） |

### 集約候補: CliCommandの評価

Unit定義（harness-api_unit.md §4）では `CliCommand` を集約ルートと記載しているが、横断契約§6の集約降格方針に照らして再評価する。

**集約ルートとしない根拠**:
- harness-apiは「薄いCLI契約レイヤー」として実行ロジックを持たない（unit定義§8「CLIの入出力変換・ディスパッチ・終了コード管理に責務を限定」）
- CliCommandのライフサイクル: 初期定義のみ（システム起動時にCommandRegistryに登録）。実行時に状態が変化しない
- CliCommandは「コマンド名・入出力仕様・終了コード定義」の不変な仕様 → VOとして表現できる
- biome-ast-engineのRuleDefinition VO、validator-systemのValidatorDefinition VOと同等パターンが先例として確立済み

**結論: CliCommandDefinition VOパターンを採用（集約なし）**

---

## 3. 設計方針

### 3.1 集約なし（CliCommandDefinition VOパターン）構成

harness-apiはステートレスなCLIエントリポイント層であり、集約を必要としない。

```
[入力]
  CLIコマンド（コマンド名 + 引数・フラグ）

[CommandRegistry（ドメインサービス）]
  → CliCommandDefinition[] の一元管理・コマンド名一意性保証
  → 8コマンド定義（check-ready/check-phase/ci-check/detect-drift/status/lint/complete-check/impact-analysis）

[CommandDispatchService（ドメインサービス）]
  → CommandName → 実行ロジック（validator-system/biome-ast-engine/nyquist-validation等）へのディスパッチ
  → 実行結果（ValidationResult / ImpactAnalysisResult 等）を HarnessApiResponse<T> に変換
  → ExitCode 決定

[出力]
  HarnessApiResponse<T>（JSON stdout）
  ExitCode（process.exitCode）
```

### 3.2 CliCommandDefinition VOの構造

```
CliCommandDefinition {
  commandName: CommandName              // "phasegate:check-ready" 等
  description: string
  inputSpec: CommandInputSpec           // 引数・フラグ定義
  outputType: CommandOutputType         // "check-ready" | "check-phase" | ... （payload型識別子）
  exitCodes: ExitCodeSpec              // { pass: 0, fail: 1, error: 2 }
}
```

CommandInputSpec・ExitCodeSpec も補助VOとして定義。

### 3.3 ドメインサービス2つの責務分離

| サービス | 責務 |
|---------|------|
| CommandRegistry | CliCommandDefinition[] の登録・管理。コマンド名の一意性保証（registerCommand / findByName / listAll） |
| CommandDispatchService | CLIコマンド実行のオーケストレーション。入力解析 → 実行ロジック委譲 → HarnessApiResponse<T>変換 → ExitCode決定 |

### 3.4 コマンド別 payload VO群

各コマンドの `HarnessApiResponse<T>` の `data` フィールドに格納するpayload VOを定義する。

| コマンド | payload VO | data フィールド型 |
|---------|-----------|----------------|
| check-ready | CheckReadyResult | `{ stories: { storyId, passed, missingPhases }[] }` |
| check-phase | PhaseInfo | `{ unitId, currentLevel, currentPhase, completedGates }` |
| ci-check | CiCheckResult | `{ validatorResults: { validatorId, passed, errors }[], allPassed: boolean }` |
| detect-drift | DriftReportSummary | `{ drifts: { direction, unit, element, recommendation }[], totalCount: number }` |
| status | HarnessStatusSummary | `{ layers: LayerHealth[], phaseGateSummary, presetInfo, config }` |
| lint | — （HarnessApiResponse共通envelopeのみ） | なし |
| complete-check | — （HarnessApiResponse共通envelopeのみ） | なし |
| impact-analysis | ImpactAnalysisResult | nyquist-validationから消費（Shared Kernelではなく参照） |

### 3.5 ArtifactScannerパターン（phasegate:status成果物駆動）

`HarnessStatusSummary`生成に使用する中間VOとして `ArtifactScanResult` を定義する。

```
ArtifactScanResult {
  scannedPaths: string[]
  foundArtifacts: ArtifactPresence[]  // { artifactType, present, lastModified? }
  derivedLayerHealth: LayerHealth[]   // L1-L4健全性の導出結果
}
```

ファイルシステムスキャンはインフラ層（ArtifactScannerPort）が担当し、ドメイン層はスキャン結果のVO変換のみを行う。

### 3.6 終了コード規約の型表現

ExitCode を union type として定義し、全コマンドで統一する:
```
ExitCode = 0 | 1 | 2
// 0: 正常/Pass、1: Fail/対象未検出、2: 実行エラー
```

### 3.7 HarnessApiResponseはShared Kernelとして扱う

`HarnessApiResponse<T>` は integration_contract.md §2.2に定義済みのCross-Unit Contract DTO。
本Unitがこれを「所有」し、agent-integration / ci-governance に提供する。
ドメイン層VОとして定義するが、他Unitからの変更は不可（読取専用）。

---

## 4. QA（設計判断の根拠）

### Q1: CliCommandを集約にしないことへの懸念 — CommandRegistryの名前一意性保証は誰が担うか

**質問**: CliCommandをVOに降格した場合、「コマンド名の一意性保証（重複防止）」という整合性責務をどこで担うか？

**推奨案**: `CommandRegistry`ドメインサービスが`registerCommand(definition)`時にコマンド名の重複チェックを行う。ドメインサービスが整合性チェックを内包するパターンは、validator-systemの`ValidatorRegistry`（ValidatorId重複防止）と同等の先例がある。

**結論**: CommandRegistryドメインサービスが一意性保証を担う。CliCommandDefinitionはVOで十分。

### Q2: CommandDispatchServiceのポート依存はドメイン層に含めるか

**質問**: CommandDispatchServiceは実行ロジック（validator-system等）を呼び出す必要があるが、この依存はドメイン層のポートとして表現すべきか？

**推奨案**: Hexagonal Architectureに従い、ドメイン層は外部実行ロジックへのポート（ValidatorExecutionPort / ImpactAnalysisPort / ArtifactScannerPort等）を定義し、インフラ層のアダプターが実装する。これにより実行ロジックへの直接依存をドメイン層から排除する。

**結論**: ポートインターフェースをドメイン層で定義し、CommandDispatchServiceはポートを通じて外部実行を委譲する。

### Q3: phasegate:status の「成果物駆動の状態導出」ロジックをどこに置くか

**質問**: H09-04では「DBやステートファイルではなく、ファイルシステム上の成果物の存在から状態を導出する」とある。このスキャンと導出ロジックはドメイン層かインフラ層か？

**推奨案**: スキャン自体はArtifactScannerPortとしてポート化（インフラ層が実装）。導出ロジック（スキャン結果→LayerHealth→HarnessStatusSummary）はドメイン層の`StatusDerivationService`として定義し、純粋な計算処理に限定する。

**結論**: ArtifactScannerPortで分離。StatusDerivationServiceをドメインサービスとして追加。

### Q4: HarnessApiResponse<T> のgenericは本Unitのドメイン概念として持つか

**質問**: `HarnessApiResponse<T>` はintegration_contractに定義されているが、ドメインモデルではどう位置づけるか。本Unitが「所有」する概念として明示すべきか？

**推奨案**: harness-apiがHarnessApiResponseを「所有」し、他Unitに提供するCross-Unit Contract DTOとして位置づける。他のVOと同様にimmutable・value equality原則を適用する。generic型パラメータTは各コマンドのpayload VO型（CheckReadyResult等）を当てはめる。

**結論**: HarnessApiResponseは本Unitが所有するVO。T=各コマンドpayload VO型。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 | 利用サービス |
|--------|------|------|------------|
| ValidatorExecutionPort | 外部→ドメイン | validator-systemのci-check/complete-check/detect-drift実行委譲 | CommandDispatchService |
| PhaseGateQueryPort | 外部→ドメイン | phase-dependency-model経由のPhase Gate通過状態照会 | CommandDispatchService |
| BiomeLintPort | 外部→ドメイン | biome-ast-engineのlint実行委譲 | CommandDispatchService |
| ImpactAnalysisPort | 外部→ドメイン | nyquist-validationのImpactAnalysisResult取得 | CommandDispatchService |
| ArtifactScannerPort | 外部→ドメイン | ファイルシステム上の成果物スキャン（phasegate:status用） | StatusDerivationService |
| ConfigQueryPort | 外部→ドメイン | HarnessConfigV2のPreset・有効設定取得 | StatusDerivationService |

---

## 6. ドメインモデル概要

### 所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| CliCommandDefinition | 値オブジェクト | CLIコマンドの不変仕様（commandName/description/inputSpec/outputType/exitCodes） |
| HarnessApiResponse\<T\> | 値オブジェクト | CLI出力共通envelope（status/errors/summary/data?）— Cross-Unit Contract DTO |
| CheckReadyResult | 値オブジェクト | 全storyのPhase Gate通過状態 |
| PhaseInfo | 値オブジェクト | 指定Unitの現在フェーズ情報（unitId/currentLevel/currentPhase/completedGates） |
| CiCheckResult | 値オブジェクト | L3バリデータ統合実行結果（validatorResults[] + allPassed） |
| DriftReportSummary | 値オブジェクト | 乖離レポートCLI出力形式（drifts[] + totalCount） |
| HarnessStatusSummary | 値オブジェクト | ハーネス全体健全性サマリー（layers/phaseGateSummary/presetInfo/config） |
| ArtifactScanResult | 値オブジェクト | 成果物スキャン中間結果（phasegate:status導出用） |
| LayerHealth | 値オブジェクト | L1-L4各レイヤーの健全性（layerId/enabled/lastResult?） |
| CommandInputSpec | 値オブジェクト | コマンド入力仕様（args/flags定義） |
| ExitCodeSpec | 値オブジェクト | 終了コード定義（pass:0/fail:1/error:2） |
| CommandRegistry | ドメインサービス | CliCommandDefinition[]の登録・管理・名前一意性保証 |
| CommandDispatchService | ドメインサービス | CLI入力→実行ロジック委譲→HarnessApiResponse変換→ExitCode決定 |
| StatusDerivationService | ドメインサービス | ArtifactScanResult→LayerHealth[]→HarnessStatusSummary導出 |

### 補助型

| 型 | 説明 |
|---|------|
| CommandName | `string`（"phasegate:check-ready" 等、`harness:` プレフィックス必須） |
| ExitCode | `0 \| 1 \| 2` |
| CommandOutputType | `'check-ready' \| 'check-phase' \| 'ci-check' \| 'detect-drift' \| 'status' \| 'lint' \| 'complete-check' \| 'impact-analysis'` |

---

## 7. 不変条件（予定）

| INV | 対象 | 内容 |
|-----|------|------|
| INV-1 | CommandRegistry | 同一CommandNameのCliCommandDefinitionは1つのみ登録可能 |
| INV-2 | CliCommandDefinition | commandNameは `harness:` プレフィックスを持つ非空文字列 |
| INV-3 | ExitCode | 値は `0 \| 1 \| 2` のみ |
| INV-4 | HarnessApiResponse | statusが"pass"の場合、errors[]は空配列 |
| INV-5 | CiCheckResult | validatorResults[]は1件以上（空のci-check結果は不正） |
| INV-6 | DriftReportSummary | totalCount === drifts.length |
| INV-7 | LayerHealth | layerIdは `'L1' \| 'L2' \| 'L3' \| 'L4'` のいずれか |

---

## 8. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 依存: validator-system | ValidationResultおよびDriftReportの構造が確定済み（Wave 2 Step 1で確定）。domain_model.md参照 |
| 依存: nyquist-validation | ImpactAnalysisResultの構造が確定済み（Wave 2 Step 1で確定）。domain_model.md参照 |
| 依存: harness-error | HarnessError型の確定が前提。Wave 1で実装済み |
| 依存: config-foundation | HarnessConfigV2の確定が前提。Wave 1で実装済み |
| リスク: StatusDerivationServiceの複雑性 | 「成果物駆動の状態導出」はスキャン対象ファイルパターンや導出ルールが実装時に複雑になりうる。ドメイン層はVO変換のみとし、スキャン実装はインフラ層のArtifactScannerPort実装に閉じ込める |
| リスク: CommandDispatchServiceの肥大化 | 8コマンドのディスパッチロジックをCommandDispatchServiceに集約すると責務が大きくなる可能性がある。各コマンド用のCommandHandlerをサブコンポーネントとして分離することを実装フェーズで検討する |
| リスク: HarnessApiResponse<T>のgenericの扱い | TypeScript genericを使用するため、実装時に型推論の複雑さが生じる可能性がある。integration_contractの定義に準拠し、ドメイン層では具体型（CheckReadyResult等）を優先する |

---

## 9. 承認

- [ ] 人間承認済み（Phase 2着手許可）
