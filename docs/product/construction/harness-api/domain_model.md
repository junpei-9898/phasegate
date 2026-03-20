# ドメインモデル: harness-api

> **Unit ID**: harness-api
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-19（Wave 2 初版）
> **Wave**: 2（コア品質機構）
> **対応ストーリー**: H09-01〜H09-04
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §4（Shared Kernel最小化）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| CliCommandDefinition | 値オブジェクト | CLIコマンドの不変仕様（commandName/description/inputSpec/outputType/exitCodes） |
| HarnessApiResponse\<T\> | 値オブジェクト | CLI出力共通envelope（status/errors[]/summary/data?）— Cross-Unit Contract DTO |
| CheckReadyResult | 値オブジェクト | 全storyのPhase Gate通過状態（stories[]付き） |
| PhaseInfo | 値オブジェクト | 指定Unitの現在フェーズ情報（unitId/currentLevel/currentPhase/completedGates） |
| CiCheckResult | 値オブジェクト | L3バリデータ統合実行結果（validatorResults[] + allPassed） |
| DriftReportSummary | 値オブジェクト | 乖離レポートCLI出力形式（drifts[] + totalCount） |
| HarnessStatusSummary | 値オブジェクト | ハーネス全体健全性サマリー（layers[]/phaseGateSummary/presetInfo/config） |
| ArtifactScanResult | 値オブジェクト | 成果物スキャン中間結果（harness:status導出用） |
| LayerHealth | 値オブジェクト | L1-L4各レイヤーの健全性（layerId/enabled/lastResult?） |
| CommandInputSpec | 値オブジェクト | コマンド入力仕様（args/flags定義） |
| ExitCodeSpec | 値オブジェクト | 終了コード定義（pass:0/fail:1/error:2） |
| CommandRegistry | ドメインサービス | CliCommandDefinition[]の登録・管理・名前一意性保証 |
| CommandDispatchService | ドメインサービス | CLI入力→実行ロジック委譲→HarnessApiResponse変換→ExitCode決定 |
| StatusDerivationService | ドメインサービス | ArtifactScanResult→LayerHealth[]→HarnessStatusSummary導出（H09-04） |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | 全コマンドのHarnessApiResponse.errors[]に使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | ConfigQueryPort経由でPreset・有効設定取得（status表示用） | 読取専用 |

### 他Unitへ公開する契約

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| HarnessApiResponse\<T\> Contract | agent-integration, ci-governance | CLI出力のJSON構造 `{ status, errors[], summary, data? }` — Cross-Unit Contract DTO |
| CLI Command Registry Contract | agent-integration, ci-governance | 全8コマンド名・入出力仕様・終了コード定義 |

---

## 2. Aggregate Boundary

### 結論: 集約なし（CliCommandDefinition VOパターン）

Unit定義（harness_api_unit.md §4）では `CliCommand（集約ルート）` と記載されていたが、横断契約§6の集約降格方針に従い集約を採用しない。

### 集約なしの根拠

| 概念 | 理由 |
|------|------|
| CliCommand（v0案） | harness-apiは「薄いCLI契約レイヤー」であり実行ロジックを持たない（unit定義§8）。CliCommandのライフサイクルは初期登録のみで実行時に状態変化しない。不変な仕様定義 → VOパターンが適切 |
| HarnessApiResponse | 実行結果スナップショット。永続化・状態遷移不要 |
| HarnessStatusSummary | ファイルシステムスキャン結果の導出VO。独立ライフサイクルなし |

biome-ast-engine の RuleDefinition VO / validator-system の ValidatorDefinition VO と同等のパターンを踏襲する。

---

## 3. Model Classification

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 説明 |
|-------------|------|---------|------|
| CliCommandDefinition | ✓ | ✓ | commandName: CommandName, description: string, inputSpec: CommandInputSpec, outputType: CommandOutputType, exitCodes: ExitCodeSpec |
| HarnessApiResponse\<T\> | ✓ | ✓ | status: ResponseStatus, errors: HarnessError[], summary: ResponseSummary, data?: T |
| CheckReadyResult | ✓ | ✓ | stories: PhaseGateStoryResult[], allPassed: boolean |
| PhaseInfo | ✓ | ✓ | unitId: string, currentLevel: number, currentPhase: string, completedGates: string[] |
| CiCheckResult | ✓ | ✓ | validatorResults: ValidatorCheckItem[], allPassed: boolean |
| DriftReportSummary | ✓ | ✓ | drifts: DriftItem[], totalCount: number |
| HarnessStatusSummary | ✓ | ✓ | layers: LayerHealth[], phaseGateSummary: PhaseGateSummary, presetInfo: PresetInfo, configSummary: ConfigSummary |
| ArtifactScanResult | ✓ | ✓ | scannedPaths: string[], foundArtifacts: ArtifactPresence[], derivedLayerHealth: LayerHealth[] |
| LayerHealth | ✓ | ✓ | layerId: LayerId, enabled: boolean, lastResult?: 'pass' \| 'fail' \| 'unknown' |
| CommandInputSpec | ✓ | ✓ | args: ArgDef[], flags: FlagDef[] |
| ExitCodeSpec | ✓ | ✓ | pass: 0, fail: 1, error: 2 |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| CommandRegistry | CliCommandDefinition[]の登録（registerCommand）・名前検索（findByName）・全件取得（listAll）。INV-1の名前一意性を保証 | — |
| CommandDispatchService | CommandName + 引数を受け取り、対応するポートに委譲。結果をHarnessApiResponse\<T\>に変換し、ExitCodeを決定する | ValidatorExecutionPort, PhaseGateQueryPort, BiomeLintPort, ImpactAnalysisPort, ArtifactScannerPort, ConfigQueryPort |
| StatusDerivationService | ArtifactScanResultを受け取りLayerHealth[]を導出し、HarnessStatusSummaryを生成する純粋な計算処理 | — |

### 補助型

| 型 | 説明 |
|---|------|
| CommandName | `string`（`harness:` プレフィックス必須の非空文字列） |
| ExitCode | `0 \| 1 \| 2`（0: 正常/Pass、1: Fail/未検出、2: 実行エラー） |
| ResponseStatus | `'pass' \| 'fail' \| 'error'` |
| CommandOutputType | `'check-ready' \| 'check-phase' \| 'ci-check' \| 'detect-drift' \| 'status' \| 'lint' \| 'complete-check' \| 'impact-analysis'` |
| LayerId | `'L1' \| 'L2' \| 'L3' \| 'L4'` |
| PhaseGateStoryResult | `{ storyId: string, passed: boolean, missingPhases: string[] }` |
| ValidatorCheckItem | `{ validatorId: string, passed: boolean, errors: HarnessError[] }` |
| DriftItem | `{ direction: 'design-to-code' \| 'code-to-design', unit: string, element: string, recommendation: string }` |
| ArtifactPresence | `{ artifactType: string, present: boolean, lastModified?: string }` |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用サービス |
|---------|------|------------|
| ValidatorExecutionPort | validator-systemのci-check / detect-drift / complete-check 実行委譲。ValidatorCheckItem[] / DriftItem[]を返す | CommandDispatchService |
| PhaseGateQueryPort | phase-dependency-model経由でPhase Gate通過状態を照会。PhaseGateStoryResult[] / PhaseInfo を返す | CommandDispatchService |
| BiomeLintPort | biome-ast-engineのlint実行委譲。ValidationResult（pass/fail + HarnessError[]）を返す | CommandDispatchService |
| ImpactAnalysisPort | nyquist-validationのImpactAnalysisResult取得（storyId指定）。ImpactAnalysisResultを返す | CommandDispatchService |
| ArtifactScannerPort | ファイルシステム上の設計文書・テストファイル・メタデータの存在をスキャン。ArtifactScanResultを返す | StatusDerivationService |
| ConfigQueryPort | HarnessConfigV2のPreset・有効設定取得。PresetInfo / ConfigSummaryを返す | StatusDerivationService |

---

## 5. Domain Rules and Invariants

### CommandRegistryの不変条件

| INV | 内容 |
|-----|------|
| INV-1 | 同一CommandNameのCliCommandDefinitionは1つのみ登録可能（重複登録でエラー） |
| INV-2 | CommandNameは `harness:` プレフィックスを持つ非空文字列 |

### HarnessApiResponseの不変条件

| INV | 内容 |
|-----|------|
| INV-3 | status が `'pass'` の場合、errors[] は空配列 |
| INV-4 | status が `'fail'` または `'error'` の場合、errors[] は1件以上 |

### ExitCode決定ルール

| status | ExitCode | 条件 |
|--------|----------|------|
| `pass` | 0 | 全チェック通過 / 正常完了 |
| `fail` | 1 | チェック失敗 / 対象未検出（存在しないUnit名等） |
| `error` | 2 | 実行エラー（ポート呼出失敗・例外等） |

このルールは全8コマンドで統一される。

### CiCheckResultの不変条件

| INV | 内容 |
|-----|------|
| INV-5 | validatorResults[] は1件以上（空のci-check結果は不正） |
| INV-6 | allPassed === validatorResults.every(r => r.passed) |

### DriftReportSummaryの不変条件

| INV | 内容 |
|-----|------|
| INV-7 | totalCount === drifts.length |

### StatusDerivationServiceのルール

- ArtifactScanResultの各レイヤーに対応する成果物（設計文書・テストファイル・メタデータ）が存在すれば `LayerHealth.lastResult = 'pass'`
- 対応する成果物が存在しない場合は `LayerHealth.lastResult = 'unknown'`（実行結果なしとして扱う）
- `LayerHealth.enabled` は ConfigQueryPort から取得した HarnessConfigV2.layers.{L}.enabled を反映

---

## 6. CLI Command Registry

### 登録される8コマンド定義

| CommandName | inputSpec | outputType | ExitCode（pass/fail/error） |
|------------|-----------|-----------|--------------------------|
| `harness:check-ready` | args:[], flags:[] | `'check-ready'` | 0/1/2 |
| `harness:check-phase` | args:[unit:string], flags:[] | `'check-phase'` | 0/1/2 |
| `harness:ci-check` | args:[], flags:[] | `'ci-check'` | 0/1/2 |
| `harness:detect-drift` | args:[], flags:[--json:boolean] | `'detect-drift'` | 0/1/2 |
| `harness:status` | args:[], flags:[] | `'status'` | 0/2 |
| `harness:lint` | args:[], flags:[] | `'lint'` | 0/1/2 |
| `harness:complete-check` | args:[], flags:[] | `'complete-check'` | 0/1/2 |
| `harness:impact-analysis` | args:[storyId:HXX-XX形式], flags:[] | `'impact-analysis'` | 0/1/2 |

> **実行ロジック所有**: harness-apiはCLIエントリポイントのみ所有。実行委譲先:
> - `harness:lint` → BiomeLintPort（biome-ast-engine）
> - `harness:ci-check` / `harness:detect-drift` / `harness:complete-check` → ValidatorExecutionPort（validator-system）
> - `harness:check-ready` / `harness:check-phase` → PhaseGateQueryPort（phase-dependency-model）
> - `harness:status` → ArtifactScannerPort + ConfigQueryPort
> - `harness:impact-analysis` → ImpactAnalysisPort（nyquist-validation）

---

## 7. HarnessApiResponse TypeScript Interface

```typescript
interface HarnessApiResponse<T = unknown> {
  status: 'pass' | 'fail' | 'error';
  errors: HarnessError[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  data?: T;
}

// コマンド別具体化例
type CheckReadyResponse = HarnessApiResponse<CheckReadyResult>;
type CheckPhaseResponse = HarnessApiResponse<PhaseInfo>;
type CiCheckResponse = HarnessApiResponse<CiCheckResult>;
type DetectDriftResponse = HarnessApiResponse<DriftReportSummary>;
type StatusResponse = HarnessApiResponse<HarnessStatusSummary>;
type ImpactAnalysisResponse = HarnessApiResponse<ImpactAnalysisResult>;
```

---

## 8. Data Flow

```
[CLIコマンド入力（コマンド名 + 引数/フラグ）]
         ↓
CommandRegistry.findByName(commandName)
  → CliCommandDefinition（inputSpec / outputType / exitCodes）
  → INV-1: コマンド名一意性（未登録コマンドはエラー）
         ↓
CommandDispatchService.dispatch(definition, args, flags)
         ↓
  [outputTypeに応じてポートへ委譲]
  ├── 'check-ready'    → PhaseGateQueryPort.queryAllStories()
  │                      → CheckReadyResult → HarnessApiResponse<CheckReadyResult>
  │
  ├── 'check-phase'    → PhaseGateQueryPort.queryUnit(unitId)
  │                      → PhaseInfo → HarnessApiResponse<PhaseInfo>
  │
  ├── 'ci-check'       → ValidatorExecutionPort.runL3Validators()
  │                      → ValidatorCheckItem[] → CiCheckResult
  │                      → HarnessApiResponse<CiCheckResult>
  │
  ├── 'detect-drift'   → ValidatorExecutionPort.runDriftDetection()
  │                      → DriftItem[] → DriftReportSummary
  │                      → HarnessApiResponse<DriftReportSummary>
  │
  ├── 'status'         → ArtifactScannerPort.scan()
  │                      → ArtifactScanResult
  │                      → StatusDerivationService.derive(scanResult, config)
  │                         ConfigQueryPort.getConfig() → PresetInfo / ConfigSummary
  │                      → HarnessStatusSummary
  │                      → HarnessApiResponse<HarnessStatusSummary>
  │
  ├── 'lint'           → BiomeLintPort.runLint()
  │                      → HarnessApiResponse（data なし）
  │
  ├── 'complete-check' → ValidatorExecutionPort.runAllValidators()
  │                      + BiomeLintPort.runLint()
  │                      → HarnessApiResponse（data なし）
  │
  └── 'impact-analysis'→ ImpactAnalysisPort.analyze(storyId)
                         → ImpactAnalysisResult
                         → HarnessApiResponse<ImpactAnalysisResult>
         ↓
ExitCode決定（INV-3/INV-4 + ExitCode決定ルール）
         ↓
[JSON stdout 出力 + process.exitCode 設定]
[agent-integration / ci-governance が消費]
```

---

## 9. 設計判断記録

### D1: CliCommandを集約にしない判断

Unit定義§4では「CliCommand（集約ルート）」と記載されていたが、§6集約降格方針に従いVOに降格した。根拠: harness-apiは「薄いCLI契約レイヤー」として実行ロジックを持たず（unit定義§8）、CliCommandのライフサイクルは初期登録のみで実行時に状態変化しない。整合性責務（名前一意性）はCommandRegistryドメインサービスが担うことでVOパターンを実現する。biome-ast-engine RuleDefinition VO / validator-system ValidatorDefinition VOと同等の先例パターンを踏襲。

### D2: StatusDerivationServiceを独立ドメインサービスにした理由

H09-04「成果物駆動の状態導出」のロジックはCommandDispatchServiceに含めず、独立したStatusDerivationServiceとして分離した。理由: （1）「ArtifactScanResult → LayerHealth[] → HarnessStatusSummary」の変換は純粋な計算処理であり、ポートに依存しないドメインロジックとして独立できる。（2）CommandDispatchServiceの肥大化を防ぐ。（3）StatusDerivationServiceを単体でテスト可能にする。

### D3: HarnessApiResponse\<T\>をgenericにした理由

integration_contract.md §2.2に定義された `HarnessApiResponse<T = unknown>` 構造に準拠する。commonの `{ status, errors[], summary }` envelopeに加え、コマンド固有のpayload型を `data?: T` で表現することで、（1）全コマンドの出力形式の一貫性を保証し、（2）agent-integrationが `data` フィールドの型を静的に検証できる。harness-apiがこのDTOの所有者として型定義を管理し、消費側（agent-integration/ci-governance）は読取専用とする。

### D4: CommandDispatchServiceのポート委譲パターン

CommandDispatchServiceはHexagonal Architectureに従い、実行ロジックへの直接依存をドメイン層から排除するため6本のポートを定義する。これにより（1）テスト時に全ポートをモック化してCommandDispatchServiceを単体テストできる、（2）実行ロジック側（validator-system等）の実装変更がドメイン層に影響しない、（3）将来のコマンド追加時に新規ポートを追加するだけで対応できる拡張性を確保する。

### D5: harness:statusのExitCode設計

`harness:status` コマンドはExitCode 0（正常）または 2（実行エラー）のみを返す（Fail=1を返さない）。理由: statusコマンドはハーネスの「状態表示」であり、Fail状態自体が正常な表示結果であるため。L4の健全性が「unknown」であっても、それは状態として正常に取得・表示できている。他のコマンド（check-ready/ci-check等）はゲートとしてPass/Failを判定するのに対し、statusは情報提供用コマンドという責務の違いを終了コードに反映する。
