# ユニットテストロジック設計計画: harness-api

> **作成日**: 2026-03-19
> **Wave**: 2

## 1. スコープ

- **対象**: `docs/product/construction/harness-api/unit_test_design.md`
- **テストケース総数**: 93件（VO×11 55件 + DS×3 28件 + 境界値 12件）
- **実装先ソース**: `scripts/harness/` 配下（Wave 2新規 Unit）

## 2. テストファイル構成（計画）

| テストファイル | 対象クラス | ケース数 |
|--------------|----------|---------|
| `scripts/harness/__tests__/unit/harness-api/cli-command-definition.test.ts` | CliCommandDefinition（VO） | 9 |
| `scripts/harness/__tests__/unit/harness-api/harness-api-response.test.ts` | HarnessApiResponse\<T\>（VO） | 8 |
| `scripts/harness/__tests__/unit/harness-api/check-ready-result.test.ts` | CheckReadyResult（VO） | 5 |
| `scripts/harness/__tests__/unit/harness-api/phase-info.test.ts` | PhaseInfo（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/ci-check-result.test.ts` | CiCheckResult（VO） | 6 |
| `scripts/harness/__tests__/unit/harness-api/drift-report-summary.test.ts` | DriftReportSummary（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/harness-status-summary.test.ts` | HarnessStatusSummary（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/artifact-scan-result.test.ts` | ArtifactScanResult（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/layer-health.test.ts` | LayerHealth（VO） | 5 |
| `scripts/harness/__tests__/unit/harness-api/command-input-spec.test.ts` | CommandInputSpec（VO） | 3 |
| `scripts/harness/__tests__/unit/harness-api/exit-code-spec.test.ts` | ExitCodeSpec（VO） | 3 |
| `scripts/harness/__tests__/unit/harness-api/command-registry.test.ts` | CommandRegistry（DS） | 8 |
| `scripts/harness/__tests__/unit/harness-api/command-dispatch-service.test.ts` | CommandDispatchService（DS） | 12 |
| `scripts/harness/__tests__/unit/harness-api/status-derivation-service.test.ts` | StatusDerivationService（DS） | 8 |

※境界値(UT-BND-*)は各ファイルに分散して記載

## 3. モック/ファクトリ設計方針

### ファクトリ関数配置

`scripts/harness/__tests__/helpers/test-helpers.ts` に追加：

- `createCliCommandDefinition(commandName?)`: デフォルト `phasegate:check-ready`
- `createHarnessApiResponse(overrides?)`: デフォルト `{ status: 'pass', errors: [], summary: '...', data: undefined }`
- `createCheckReadyResult(overrides?)`: デフォルト `{ stories: [{ storyId: 'H09-01', passed: true }], allPassed: true }`
- `createCiCheckResult(overrides?)`: デフォルト `{ validatorResults: [{ validatorId: 'L2-001', passed: true }], allPassed: true }`
- `createDriftReportSummary(overrides?)`: デフォルト `{ drifts: [], totalCount: 0 }`
- `createLayerHealth(overrides?)`: デフォルト `{ layerId: 'L1', enabled: true, lastResult: 'pass' }`
- `createArtifactScanResult(overrides?)`: デフォルト 空のスキャン結果

### モック方針

- **VO**: モック不使用（実体を直接生成）
- **CommandRegistry**: モック不使用（登録テストは実体）
- **StatusDerivationService**: ポート依存なし（純粋計算）—モック不要
- **CommandDispatchService のポート**: `vi.fn()` でモック
  - `ValidatorExecutionPort`, `PhaseGateQueryPort`, `BiomeLintPort`
  - `ImpactAnalysisPort`, `ArtifactScannerPort`, `ConfigQueryPort`

## 4. QA（不明点・確認事項）

なし

## 5. 前提条件・リスク

- `HarnessStatusSummary` は L1/L2/L3/L4 の4レイヤーを必須とする（INV: layersは4件固定）
- `CommandDispatchService` の `§9-D5` ルール：`phasegate:status` コマンドは exitCode=0 固定（fail=1 を返さない）
- `ExitCodeSpec` は pass=0 固定（INV）、fail/error は任意の正整数だが重複禁止
- `CliCommandDefinition` の commandName は `harness:` プレフィックス必須かつコマンド名部分が英小文字始まり
