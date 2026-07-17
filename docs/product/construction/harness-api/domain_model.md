# ドメインモデル: harness-api

@story-id H09-01
@story-id H09-02
@story-id H09-03
@story-id H09-04
@work-item-id WI-112
@work-item-id WI-114
@work-item-id WI-119
@work-item-id WI-121
@work-item-id WI-307
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
| DriftReportSummary | 値オブジェクト | 乖離レポートCLI出力形式（sampled drifts[] + totalCount + category summaries） |
| HarnessStatusSummary | 値オブジェクト | ハーネス全体健全性サマリー（layers[]/phaseGateSummary/presetInfo/config） |
| ArtifactScanResult | 値オブジェクト | 成果物スキャン中間結果（phasegate:status導出用） |
| LayerHealth | 値オブジェクト | L1-L4各レイヤーの健全性（configuration / cached artifact / live validation を分離） |
| CommandInputSpec | 値オブジェクト | コマンド入力仕様（args/flags定義） |
| ExitCodeSpec | 値オブジェクト | 終了コード定義（pass:0/fail:1/error:2） |
| CommandRegistry | ドメインサービス | CliCommandDefinition[]の登録・管理・名前一意性保証 |
| CommandDispatchService | ドメインサービス | CLI入力→実行ロジック委譲→HarnessApiResponse変換→ExitCode決定 |
| StatusDerivationService | ドメインサービス | ArtifactScanResult→LayerHealth[]→HarnessStatusSummary導出（H09-04） |

<!-- @work-item-id WI-184 -->
`skills list` treats `core`, `aidlc`, `utility`, and `guidance` as first-class skill catalog categories. The command uses the same `skills/<name>/SKILL.md` source rule as `skills info <name>` and treats a missing `skills/` directory as an empty catalog.

G5 semantic validator output remains validator-system owned. harness-api preserves L3/L4 `validatorResults[]` for WI-119 dead-code graph findings and WI-121 performance operational signals without duplicating policy.

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

Unit定義（harness-api_unit.md §4）では `CliCommand（集約ルート）` と記載されていたが、横断契約§6の集約降格方針に従い集約を採用しない。

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
| DriftReportSummary | ✓ | ✓ | drifts: ActionableDriftItem[], totalCount: number, categorySummaries: DriftCategorySummary[], actionPlan: DriftCategorySummary[] |
| HarnessStatusSummary | ✓ | ✓ | layers: LayerHealth[], phaseGateSummary: PhaseGateSummary, presetInfo: PresetInfo, configSummary: ConfigSummary |
| ArtifactScanResult | ✓ | ✓ | scannedPaths: string[], foundArtifacts: ArtifactPresence[], derivedLayerHealth: LayerHealth[] |
| LayerHealth | ✓ | ✓ | layerId: LayerId, enabled: boolean, lastResult?: 'pass' \| 'fail' \| 'unknown', configurationState, cachedArtifactState, liveValidationState |
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
| ActionableDriftItem | `DriftItem & { category: DriftCategory, severity: 'info' \| 'warning' \| 'error', nextAction: string }` |
| DriftCategorySummary | `{ category: DriftCategory, severity, count, nextAction }` |
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
| INV-6 | `allPassed === validatorResults.every(r => r.passed || r.skipped)`をpublic contractで保証する。WI-260/ADR-017のseverity-aware判定をWI-307で各public itemにも射影し、raw `passed=false`かつwarningのみなら`failOnWarning=false`（既定）でpublic `passed=true`、trueでfalseとする。warning diagnosticsは保持し、error severityまたはerrors=[]の防御的failureはfalseを維持する。`fromResults(results, failOnWarning=false)` / `create({..., failOnWarning?})`は`validate`経路と同じpolicyを使う。 |

### DriftReportSummaryの不変条件

| INV | 内容 |
|-----|------|
| INV-7 | `create()` では totalCount === drifts.length |
| INV-7a | `fromDrifts()` は repository scale 出力用に `drifts[]` を sampleLimit 件へ圧縮し、`totalCount/rawDriftCount` に元件数を保持する。@work-item-id WI-114 |
| INV-7b | L4 drift は WI-107 に従い advisory signal として扱い、`phasegate:detect-drift` は drift ありでも `status='pass'` / exitCode 0 / summary.warnings に件数を載せる |

### StatusDerivationServiceのルール

- `LayerHealth.configurationState` は preset/config 上の enabled/disabled を表す。
- `LayerHealth.cachedArtifactState` はファイルシステム上の成果物有無（present/missing/unknown）を表す。
- `LayerHealth.liveValidationState` は status 実行時に取得できた lint/validator 実行結果（pass/fail/skipped/not-run/error）を表す。
- `LayerHealth.lastResult` は後方互換用の要約であり、live validation の pass/fail を優先し、なければ cached artifact から pass/unknown を導出する。@work-item-id WI-112
- disabled レイヤーでも live validation が skipped と分かる場合は `configurationState='disabled'` と `liveValidationState='skipped'` を併記し、設定無効と未実行を混同しない。

---

## 6. CLI Command Registry

### 登録される8コマンド定義

| CommandName | inputSpec | outputType | ExitCode（pass/fail/error） |
|------------|-----------|-----------|--------------------------|
| `phasegate:check-ready` | args:[], flags:[] | `'check-ready'` | 0/1/2 |
| `phasegate:check-phase` | args:[unit:string], flags:[] | `'check-phase'` | 0/1/2 |
| `phasegate:ci-check` | args:[], flags:[] | `'ci-check'` | 0/1/2 |
| `phasegate:detect-drift` | args:[], flags:[--json:boolean] | `'detect-drift'` | 0/1/2 |
| `phasegate:status` | args:[], flags:[] | `'status'` | 0/2 |
| `phasegate:lint` | args:[], flags:[] | `'lint'` | 0/1/2 |
| `phasegate:complete-check` | args:[], flags:[] | `'complete-check'` | 0/1/2 |
| `phasegate:impact-analysis` | args:[storyId:HXX-XX形式], flags:[] | `'impact-analysis'` | 0/1/2 |

> **実行ロジック所有**: harness-apiはCLIエントリポイントのみ所有。実行委譲先:
> - `phasegate:lint` → BiomeLintPort（biome-ast-engine）
> - `phasegate:ci-check` / `phasegate:detect-drift` / `phasegate:complete-check` → ValidatorExecutionPort（validator-system）
> - `phasegate:check-ready` / `phasegate:check-phase` → PhaseGateQueryPort（phase-dependency-model）
> - `phasegate:status` → ArtifactScannerPort + ConfigQueryPort
> - `phasegate:impact-analysis` → ImpactAnalysisPort（nyquist-validation）

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
  ├── 'ci-check'       → ValidatorExecutionPort.runAllValidators()
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

### D5: phasegate:statusのExitCode設計

`phasegate:status` コマンドはExitCode 0（正常）または 2（実行エラー）のみを返す（Fail=1を返さない）。理由: statusコマンドはハーネスの「状態表示」であり、Fail状態自体が正常な表示結果であるため。L4の健全性が「unknown」であっても、それは状態として正常に取得・表示できている。他のコマンド（check-ready/ci-check等）はゲートとしてPass/Failを判定するのに対し、statusは情報提供用コマンドという責務の違いを終了コードに反映する。

### D6: operational transparency fields in phasegate:status

`HarnessStatusSummary` includes `hookHealth`, `baselineHealth`, and `operationalWarnings` in addition to layer health. Hook health reports configured hook files, latest skip event, skip counts by reason, and the Codex native `apply_patch` pre-edit limitation with the L2 pre-commit backstop. Baseline health reports grandfathered file count, sha mismatch count, missing file count, and removal rate. These are informational health signals and do not convert hook skip or baseline grandfather state into validator failure. @work-item-id WI-123
<!-- @work-item-id WI-117, WI-118, WI-122, WI-139 -->
## G3 L4 Advisory Report Semantics

Harness API consumes G3 L4 reports as advisory signals unless the caller opts into fail-on-warning behavior. Drift, consistency, pointer/freshness, and semantic drift report records must preserve category, location, severity, and next action for downstream summaries.
<!-- @work-item-id WI-132, WI-137, WI-138 -->
## G4 Public API Contract Projection

Harness API / CLI response contracts can feed L2-015 as `PublicContract` and `ErrorContract` records. The shared response envelope remains owned by harness-api; validator-system only consumes projected semantic contract records and returns standard `ValidationResultContract` findings.

<!-- @work-item-id WI-162 -->
## WI-162 Status And Drift Payload Schema

`phasegate:status --json` owns the public health payload for agents and CI. `HarnessStatusSummary` contains:

| Field | Meaning |
|---|---|
| `layers[].configurationState` | Resolved layer intent: `enabled` or `disabled`. |
| `layers[].cachedArtifactState` | Whether cached report/artifact evidence exists: `present`, `missing`, or `unknown`. |
| `layers[].liveValidationState` | Current execution signal: `pass`, `fail`, `skipped`, `not-run`, or `error`. |
| `hookHealth` | Hook enablement, configured hook names, latest skip event, skip counts, and Codex `apply_patch` backstop status. |
| `baselineHealth` | Baseline enabled state, path, grandfathered count, SHA mismatches, missing files, and removal rate. |
| `operationalWarnings` | Non-gating warnings with `code`, `message`, and `nextAction`. |

`phasegate:detect-drift --json` preserves `category`, `severity`, and `nextAction` in addition to the raw drift item. Structural drift remains `L4-001`; semantic drift is keyed by `unitName + behaviorId` across `DesignIntent`, `ImplementationBehavior`, and `TestObservation`.

<!-- @work-item-id WI-166 -->
## WI-166 Hook Skip Status Projection

Harness API reads `.phasegate/hook-skip-events.jsonl` as the shared hook skip record used by both `agent-integration` and public setup diagnostics. Status projection keeps the event diagnostic: it reports latest event, counts by reason, and recommended next action in `hookHealth` / `operationalWarnings`, but it does not turn skip history into a validator failure. The event schema is append-only and tolerant of malformed lines so a partial runtime log cannot break `phasegate:status --json`.
## WI-186 Status Verdict Model

<!-- @work-item-id WI-186 -->

`HarnessStatusSummary` contains layer health for L1-L4 and is used by `phasegate:status` to expose live validation state. Enabled layers with live state `fail` or `error` make the status response `fail`; disabled layers and skipped/not-run live states do not create a failing top-level verdict. This separates the machine-readable health verdict from the informational command exit-code rule.

## WI-197 Alias Command Model

<!-- @work-item-id WI-197 -->

Legacy alias names are presentation-level command identities, not separate domain commands. `status` maps to `phasegate:status`; `complete-check` maps to `phasegate:complete-check`. The response envelope, status derivation, validator execution, and exit-code rules are inherited from the canonical command.

## WI-203 Complete Check Command Identity

<!-- @work-item-id WI-203 -->

`phasegate:complete-check` is a registry-backed command identity. It is not modeled as a downstream filesystem artifact. Consumers may run the command through `main.ts` / the `phasegate` binary, but they must not require a project to contain `scripts/harness/cli/complete-check.ts` unless that project deliberately provides a custom extension wrapper outside the built-in command contract.

## WI-109 Integration Entrypoint Boundary

<!-- @work-item-id WI-109 -->

| Concept | Owner | Meaning |
| --- | --- | --- |
| Integration entrypoint | harness-api | CLI/hook boundary (`pre-commit.ts`) that may compose config-foundation composition roots and application mappers but must not import foreign infrastructure concrete classes. |

**Invariants**:

- Integration entrypoints depend on composition / application contracts, not on foreign infrastructure concrete error classes. The config-not-found fallback is discriminated by `Error.name === "ConfigNotFoundError"` at the boundary instead of importing `file-system-config-repository`.
- `phasegate:lint` / `phasegate:complete-check` stay usable as clean release gates for PhaseGate's own repository, so `no-layer-violation` is detected in the same direction as production dependencies.

## WI-113 Validate Format Value

<!-- @work-item-id WI-113 -->

| Concept | Owner | Meaning |
| --- | --- | --- |
| `ValidateFormat` | harness-api | CLI boundary value limited to `human`, `agent`, and `ci`. |

**Invariants**:

- `validate` must not silently coerce an unsupported `--format` value into human output; the CLI boundary rejects it fail-fast with a clear stderr message and non-zero exit before validator execution.
- Supported format lists in help text and parser validation stay aligned. `json` is intentionally unsupported until a validate JSON schema is designed for every layer.

## WI-143 Work Item Scaffolding Concepts

<!-- @work-item-id WI-143 -->

| Concept | Owner | Meaning |
| --- | --- | --- |
| Work Item ID allocation | harness-api | Next sequential `WI-XXX` derived by scanning existing `docs/inception/**/WI-NNN/description.md`; zero-padded to three digits. |
| Inception root scaffolding | harness-api | Ensures `_shared` / `_cross` / `{unit}` directories exist before a work item description is written. |
| Agent rules block | harness-api | The `CLAUDE.md` / `AGENTS.md` WI workflow rule text emitted for injection by `init` / `update-skills`. |
| Legacy plan drift signal | harness-api | Count of `*_plan.md` / `codding_plan/` files present while zero WI directories exist, used to suggest `migrate work-items`. |

**Invariants**:

- A scaffolded work item always writes a frontmatter-carrying `description.md` (`id` / `type` / `severity` / `status`) under the resolved inception root.
- Legacy plan detection reports zero once any WI directory exists; it is a migration hint, not a gate failure.

## WI-250 Canonical Known-Command Catalog

<!-- @work-item-id WI-250 -->

| Concept | Owner | Meaning |
| --- | --- | --- |
| `KNOWN_HARNESS_COMMANDS` | harness-api (domain) | Dependency-free readonly, sorted catalog of every top-level CLI command name dispatched by the `switch (command)` in `main.ts`, including non-`phasegate:`-prefixed commands that `CommandRegistry` cannot represent. |

**Invariants**:

- The catalog is set-equal to the `case "..."` labels of the `main.ts` dispatch `switch`; a conformance test enforces this so drift fails the gate.
- Entries are unique and sorted; the constant has no runtime dependencies so any unit (e.g., ci-governance infrastructure) may import it without violating dependency direction.

<!-- @work-item-id WI-254 -->

**WI-254 での拡張**: integrity pin の CLI 化に伴い `integrity:pin` / `integrity:verify` の 2 エントリをカタログへ追加（main.ts の dispatch case と同時更新。conformance ゲートが両者の同期を強制するため、片側のみの更新は fail する — これが WI-250 が意図した乖離検出の実働例）。

## WI-291 World inspect command identity

<!-- @work-item-id WI-291 -->

@story-id H17-06

`world:inspect`をharness-api所有のtop-level command identityとして`KNOWN_HARNESS_COMMANDS`へ追加する。catalogは引き続きdependency-free、unique、sortedで、main dispatchのcase集合と完全一致する。Snapshot、diagnostic、exit classificationのdomain意味はworld-modelに属し、harness-apiは複製しない。

## WI-296 World command catalog completion

<!-- @work-item-id WI-296 -->

@story-id H17-10

`world:pin`と`world:derive`をcanonical top-level command identityへ追加し、`world:inspect`と合わせた3 command集合を完成する。harness-apiはcommand名とdispatch集合一致だけを所有し、pin candidate、WCR、obligation classificationを複製しない。

## WI-300 World config dispatch input

<!-- @work-item-id WI-300 -->

mainはconfig-foundation public mapperが返すplain World DTOだけをdispatch inputとして扱う。`world.enabled`はautomatic integration用switchであり、三つのexplicit command identityやhandler availabilityを変更しない。
