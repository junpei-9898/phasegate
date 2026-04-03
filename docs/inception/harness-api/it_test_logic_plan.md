# ITテストロジック設計計画: harness-api

## 1. スコープ

- 対象テストケース設計: `docs/product/construction/harness-api/it_test_design.md`
- 参照論理設計: `docs/product/construction/harness-api/logical_design.md`
- テストケース総数: 約103件
  - UseCase: 28件（InitRegistry×5, DispatchCmd×11, DecideExitCode×6, DeriveStatus×6）
  - Infrastructure Adapter: 29件（ValidatorExec×6, PhaseGateQuery×5, BiomeLint×4, ImpactAnalysis×5, ArtifactScanner×5, ConfigQuery×4）
  - Handler: 34件（8Handlers × 平均4件）
  - Cross-Layer統合: 12件（CommandDispatch統合×5, StatusDerivation統合×4, SharedKernel×3）

---

## 2. テストファイル構成（計画）

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/harness-api/initialize-command-registry-usecase.test.ts` | InitializeCommandRegistryUseCase | 5 |
| `scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts` | DispatchCommandUseCase | 11 |
| `scripts/harness/__tests__/integration/harness-api/decide-exit-code-usecase.test.ts` | DecideExitCodeUseCase | 6 |
| `scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts` | DeriveHarnessStatusUseCase | 6 |
| `scripts/harness/__tests__/integration/harness-api/validator-system-execution-adapter.test.ts` | ValidatorSystemExecutionAdapter | 6 |
| `scripts/harness/__tests__/integration/harness-api/phase-dependency-model-query-adapter.test.ts` | PhaseDependencyModelQueryAdapter | 5 |
| `scripts/harness/__tests__/integration/harness-api/biome-ast-engine-lint-adapter.test.ts` | BiomeAstEngineLintAdapter | 4 |
| `scripts/harness/__tests__/integration/harness-api/nyquist-validation-impact-analysis-adapter.test.ts` | NyquistValidationImpactAnalysisAdapter | 5 |
| `scripts/harness/__tests__/integration/harness-api/file-system-artifact-scanner-adapter.test.ts` | FileSystemArtifactScannerAdapter | 5 |
| `scripts/harness/__tests__/integration/harness-api/harness-config-query-adapter.test.ts` | HarnessConfigQueryAdapter | 4 |
| `scripts/harness/__tests__/integration/harness-api/check-ready-handler.test.ts` | CheckReadyHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/check-phase-handler.test.ts` | CheckPhaseHandler | 5 |
| `scripts/harness/__tests__/integration/harness-api/ci-check-handler.test.ts` | CiCheckHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/detect-drift-handler.test.ts` | DetectDriftHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/status-handler.test.ts` | StatusHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/lint-handler.test.ts` | LintHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/complete-check-handler.test.ts` | CompleteCheckHandler | 4 |
| `scripts/harness/__tests__/integration/harness-api/impact-analysis-handler.test.ts` | ImpactAnalysisHandler | 5 |
| `scripts/harness/__tests__/integration/harness-api/command-dispatch-integration.test.ts` | CommandDispatch統合フロー | 5 |
| `scripts/harness/__tests__/integration/harness-api/status-derivation-integration.test.ts` | StatusDerivation統合フロー | 4 |
| `scripts/harness/__tests__/integration/harness-api/shared-kernel-contract.test.ts` | SharedKernel Contract検証 | 3 |

---

## 3. モック・フィクスチャ設計方針

### UseCase テスト
- **InitializeCommandRegistryUseCase**: `CommandRegistry` は実体を使用
- **DispatchCommandUseCase**: 6ポート（ValidatorExecutionPort, PhaseGateQueryPort, BiomeLintPort, ImpactAnalysisPort, ArtifactScannerPort, ConfigQueryPort）を `vi.fn()` でモック。`CommandDispatchService` は実体
- **DecideExitCodeUseCase**: 純粋関数。モック不要
- **DeriveHarnessStatusUseCase**: `ArtifactScannerPort`, `ConfigQueryPort` を `vi.fn()` でモック。`StatusDerivationService` は実体

### Infrastructure Adapter テスト
- **ValidatorSystemExecutionAdapter**: `vi.mock()` で validator-system 共有カーネルをスタブ化
- **PhaseDependencyModelQueryAdapter**: `vi.mock()` で phase-dependency-model をスタブ化
- **BiomeAstEngineLintAdapter**: `vi.mock()` で biome-ast-engine をスタブ化
- **NyquistValidationImpactAnalysisAdapter**: `vi.mock()` で nyquist-validation をスタブ化
- **FileSystemArtifactScannerAdapter**: フィクスチャディレクトリを実ファイルで作成 + `afterEach` クリーンアップ
- **HarnessConfigQueryAdapter**: フィクスチャ JSON ファイルを参照

### Handler テスト
- `DispatchCommandUseCase` を `vi.fn()` でモック
- `process.exitCode` の値を検証（`process.exit()` の呼び出しではなく exitCode プロパティ）
- `process.stdout.write` を `vi.spyOn()` でキャプチャし、JSON出力を検証

### シードデータ配置
```
scripts/harness/__tests__/fixtures/harness-api/
├── artifact-scan/
│   ├── full-artifacts/          # 全レイヤー成果物あり
│   └── missing-l3/              # L3統合テストなし
└── config/
    ├── harness-config-standard.json
    ├── harness-config-strict.json
    └── harness-config-minimal.json
```

---

## 4. テストヘルパー設計

### インポートパス
- ルート直下（全テストファイル）: `../../helpers/test-helpers`（2段階）

### 共通ファクトリ（インライン定義）
- `createMockPorts()`: 全6ポートをvi.fn()で生成してまとめて返すヘルパー
- `createDispatchCommandUseCase(ports)`: ポートを注入したDispatchCommandUseCaseを生成
- `createHarnessApiResponse(overrides?)`: HarnessApiResponseのデフォルト値

---

## 5. QA（不明点・確認事項）

なし。it_test_design.md に全コンポーネント・モック方針・シードデータが詳細に記述されている。

---

## 6. 前提条件・リスク

- **`@stub: wave2-pending` コメント**: Wave 2 未確定インターフェースへのテストには規定コメントを付与する
- **D5ルール（phasegate:status）**: status コマンドは fail でも exitCode=0 返却。テストで特別扱いが必要
- **process.exitCode vs process.exit**: Handler が `process.exitCode =` で設定する場合と `process.exit()` を呼ぶ場合を設計で明示
- **Cross-Layer統合**: 3つの統合テストファイルは UseCase 実体 + Port モック構成
- **DB不要**: ローカルCLIツール
