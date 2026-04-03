---
title: Phasegate — 既知の問題・スタブ台帳
updated: 2026-03-22
status: active
---

# Phasegate 既知の問題・スタブ台帳

全機能の実CLI動作確認（2026-03-22）で発見した問題・スタブ残存の記録。
各項目に「発見」→「修正済み／未修正」のステータスを記載する。

---

## 1. 修正済みバグ

### BUG-01: `skill:apply-cascade-update` — globパターンをリテラルファイルパスとして扱う
- **発見**: `--dry-run` 実行時に1605ファイルが書き換えられた
- **原因**:
  - `CascadeUpdateService.resolve()` がglobパターン（`scripts/**/*.ts`）を `CascadeUpdateTarget.filePath` にそのまま格納
  - `ApplyCascadeUpdateUseCase` が `fileSystemPort.read(target.filePath)` をリテラルパスとして呼び出していた
  - `FileSystemPort` に `glob()` メソッドが存在しなかった
- **修正**:
  - `FileSystemPort` に `glob(pattern: string): Promise<readonly string[]>` を追加
  - `ApplyCascadeUpdateUseCase` でワイルドカード含むパスを `glob()` で展開してから処理
  - `NodeFileSystemAdapter`（composition-root内）に `tinyglobby` を使用した `glob()` 実装を追加
- **影響ファイル**:
  - `scripts/harness/skill-quality/domain/ports/file-system-port.ts`
  - `scripts/harness/skill-quality/application/usecases/apply-cascade-update-usecase.ts`
  - `scripts/harness/skill-quality/composition-root.ts`

### BUG-02: `skill:apply-cascade-update --dry-run` — dryRunフラグが未伝達
- **発見**: `--dry-run` 指定時も実際にファイルを書き換えていた
- **原因**: `ApplyCascadeUpdateHandler.handle(args)` が `args.dryRun` を `useCase.execute()` に渡していなかった
- **修正**: `ApplyCascadeUpdateInput` に `dryRun?: boolean` を追加し、Handler→UseCase間で正しく伝達
- **影響ファイル**:
  - `scripts/harness/skill-quality/application/dto/apply-cascade-update-input.ts`
  - `scripts/harness/skill-quality/presentation/handlers/apply-cascade-update-handler.ts`

### BUG-03: `validate-metadata` — Unit ID パターンが Markdown 太字フォーマットを認識しない
- **発見**: `@unit harness-error` を含むファイルが `unit 定義に存在しません` エラーになった
- **原因**: `MarkdownUnitDefinitionGateway` の `UNIT_ID_PATTERN` (`/Unit\s+ID\s*[:：]\s*(\S+)/`) が `> **Unit ID**: harness-error` にマッチしない
- **修正**: 正規表現を `/Unit\s+ID\*{0,2}\s*[:：]\s*(\S+)/` に変更
- **影響ファイル**:
  - `scripts/harness/traceability-model/infrastructure/gateways/markdown-unit-definition-gateway.ts`

---

## 2. 修正済みスタブ（Wave 2完了後の実装差し替え）

### STUB-01: `phasegate:lint` — `BiomeAstEngineLintAdapter` 常に空violations返却
- **発見**: `phasegate:lint` が常に violations=0 を返していた（直接 `lint` コマンドは実動作）
- **原因**: `BiomeAstEngineLintAdapter` のデフォルトが `{ violations: [] }` を返すスタブ
- **修正**: デフォルト実装を `createBiomeAstEngineModule(process.cwd()).executeLintUseCase.execute()` に差し替え
- **影響ファイル**:
  - `scripts/harness/harness-api/infrastructure/adapters/biome-ast-engine-lint-adapter.ts`
  - `scripts/harness/biome-ast-engine/composition-root.ts`（`executeLintUseCase` エクスポート追加）

### STUB-02: `phasegate:ci-check` / `phasegate:complete-check` / `phasegate:detect-drift` — `ValidatorSystemExecutionAdapter` 常に空配列返却
- **発見**: 全バリデータ結果が空で返るため実質チェックなし
- **原因**: `ValidatorSystemExecutionAdapter` のデフォルトスタブが `[]` を返す
- **修正**: デフォルト実装を `createValidatorSystemModule()` の各UseCaseに差し替え
- **影響ファイル**:
  - `scripts/harness/harness-api/infrastructure/adapters/validator-system-execution-adapter.ts`

### STUB-03: `phasegate:impact-analysis` — `NyquistValidationImpactAnalysisAdapter` 常にnull返却
- **発見**: `phasegate:impact-analysis` が常に impact なしを返していた
- **原因**: `NyquistValidationImpactAnalysisAdapter` のデフォルトスタブが `null` を返す
- **修正**: `createNyquistValidationModule(deps).analyzeImpactUseCase.execute()` に差し替え
- **影響ファイル**:
  - `scripts/harness/harness-api/infrastructure/adapters/nyquist-validation-impact-analysis-adapter.ts`

### STUB-04: `phasegate:check-phase` / `phasegate:check-ready` — `PhaseDependencyModelQueryAdapter` 常に空返却
- **発見**: phase gate情報が常に空だった
- **原因**: `PhaseDependencyModelQueryAdapter` のデフォルトスタブが `[]` / `null` を返す
- **修正**: `createPhaseDependencyModelModule(config).checkPhaseGateUseCase.execute()` に差し替え
- **影響ファイル**:
  - `scripts/harness/harness-api/infrastructure/adapters/phase-dependency-model-query-adapter.ts`

### STUB-05: `skill:check-coverage` — VitestCoverageRunnerAdapter 80%ハードコード
- **発見**: `skill:check-coverage` が常に line=80, branch=75, fn=85 を返していた（＋`@vitest/coverage-v8` 未インストールでコマンド自体クラッシュ）
- **原因**: `VitestCoverageRunnerAdapter.run()` で `execSync` 後の JSON 出力を無視してハードコード値を返す
- **修正**: 実際に vitest coverage を実行しカバレッジ集計 JSON を解析する実装に差し替え。ファイルが事前生成されている場合はそれを利用
- **影響ファイル**:
  - `scripts/harness/skill-quality/infrastructure/adapters/vitest-coverage-runner-adapter.ts`
  - `scripts/harness/__tests__/vitest.config.ts`（coverage設定追加）

---

## 3. 修正済みバグ（継続修正・Wave 1〜2A）

### BUG-05: `phasegate:check-phase` / `phasegate:check-ready` — InvalidPlanningModeErrorでクラッシュ
- **発見**: `phasegate:check-phase <unit>` が "Error: phase gate check failed unexpectedly" で失敗
- **原因**: `phase-dependency-model/composition-root.ts` の `defaultPhaseConfig.planningMode` が `'standard'`（無効値）にハードコードされていた。有効値は `'interactive' | 'embedded-qa'`
- **修正**: `planningMode: 'standard'` → `planningMode: 'interactive'` に変更
- **影響ファイル**:
  - `scripts/harness/phase-dependency-model/composition-root.ts`

---

## 4. 修正済みバグ（継続修正・Wave 2A〜2B）

### BUG-04: `lint --target <file>` — ファイルパス指定時にENOTDIRエラー
- **発見**: `lint --target scripts/harness/foo.ts` が "lint execution failed unexpectedly" で失敗
- **原因**: `NodeWorkspaceFileAdapter.listSourceFiles(targets)` が `targets[0]` を base directory として `walkDirectory()` を呼ぶ。ファイルパスで `readdir()` が ENOTDIR をスローする
- **修正**: `listSourceFiles()` でパスがファイルかディレクトリかを `stat()` で判定し、ファイルの場合は直接追加
- **影響ファイル**:
  - `scripts/harness/biome-ast-engine/infrastructure/adapters/node-workspace-file-adapter.ts`

### BUG-06: Wave 2A テストファイル — 裸の `@story-id H08-07` によるTypeScriptパースエラー
- **発見**: `pnpm test` で `Expected ";" but found "H08"` エラー（44ファイル）
- **原因**: Wave 2A コード生成時に `.ts`/`.test.ts` ファイル末尾にJavaScript式として `@story-id H08-07` が挿入された。コメント形式（`// @story-id H08-07`）でなければTypeScriptのパースエラーになる
- **修正**: 44ファイルの裸の `@story-id` 行を `// @story-id` コメントに変換
- **影響ファイル**: `scripts/harness/validator-system/` 配下16ファイル、`scripts/harness/nyquist-validation/` 配下11ファイル、`scripts/harness/__tests__/` 配下17ファイル

### BUG-07: `ValidatorId` — L1-017/L1-018/L2-013 を無効IDと判定
- **発見**: `RunL1ValidatorsUseCase` テストが全件 `Invalid validator ID: "L1-017"` エラー
- **原因**: `ValidatorId` のパターンが `^L[2-4]-\d{3}$` でL1レイヤーを許可しておらず、VALID_IDSにも新バリデータが未登録だった
- **修正**: パターンを `^L[1-4]-\d{3}$` に拡張し、L1-017/L1-018/L2-013をVALIDATOR_NAME_MAPに追加
- **影響ファイル**:
  - `scripts/harness/validator-system/domain/value-objects/validator-id.ts`

### BUG-08: `validate --layer L1` — `RunValidatorsHandler` が L1 レイヤーを受け付けない
- **発見**: `validate --layer L1` がルーティングされず `RunFullValidationUseCase` にフォールスルーしていた
- **原因**: `RunValidatorsHandlerArgs.layer` 型が `'L2' | 'L3' | 'L4' | 'all'` のみで `'L1'` を含まず、L1ディスパッチ分岐も存在しなかった
- **修正**:
  - `layer` 型に `'L1'` を追加
  - `RunValidatorsHandlerDeps` に `runL1ValidatorsUseCase?: RunL1ValidatorsUseCase` を追加
  - `execute()` に L1 ディスパッチ分岐を追加（`AggregatedValidationReport` に変換してフォーマッタへ渡す）
- **影響ファイル**:
  - `scripts/harness/validator-system/presentation/handlers/run-validators-handler.ts`

### BUG-09: `validate --layer L1` — `RunL1ValidatorsUseCase` が CLI から未ワイヤード
- **発見**: `validate --layer L1` 実行時に "L1 validators not configured" が返った
- **原因**: `validator-system/composition-root.ts` に `RunL1ValidatorsUseCase` とその4つのアダプターが注入されていなかった
- **修正**:
  - `RunL1ValidatorsUseCase` を `createValidatorSystemModule()` に追加
  - 4つのアダプターを生成・注入: `ItTestFileAnalyzerAdapter`、`SourceFileTextScannerAdapter`（`excludePattern: /__tests__\//`）、`E2eTestFileRegistryAdapter`、`CliCommandRegistryAdapter`（12コマンドのホワイトリスト）
  - `RunValidatorsHandler` に `runL1ValidatorsUseCase` を渡すよう修正
- **影響ファイル**:
  - `scripts/harness/validator-system/composition-root.ts`

### BUG-10: `validate --layer L1` の `targetPaths` — 空配列がファイル探索をスキップ
- **発見**: `validate --layer L1`（ターゲット未指定）でL1-018が `0ms` でPASSしスキャンが実行されなかった
- **原因**:
  - `main.ts` が `targetPaths: []`（空配列）を `RunValidatorsHandler` に渡していた
  - `SourceFileTextScannerAdapter.scanForPattern()` は `targetPaths ? [...targetPaths] : discoverSourceFiles()` のため、空配列（truthy）でも自動探索をスキップしていた
- **修正**: Handler側で空配列を `undefined` に変換: `targetPaths && targetPaths.length > 0 ? targetPaths : undefined`
- **影響ファイル**:
  - `scripts/harness/validator-system/presentation/handlers/run-validators-handler.ts`

### BUG-11: `validate` — `targetPaths` にフラグ値が混入
- **発見**: `validate --layer L1` 実行時に `targetPaths=["validate"]`（コマンド名が混入）が確認された
- **原因**: `main.ts` の targetPaths 抽出が `args.filter((a) => !a.startsWith('--'))` で実装されており、`--layer` の値（`L1`）や `args[0]`（コマンド名 `validate`）がファイルパスとして混入した
- **修正**:
  - `parsePositionalArgs(args, flagsWithValues)` ヘルパー関数を追加。フラグとその値ペアをスキップし位置引数のみを返す
  - `targetPaths` 抽出を `parsePositionalArgs(args.slice(1), ['--layer', '--unit', '--phase', '--format'])` に変更（`args.slice(1)` でコマンド名をスキップ）
- **影響ファイル**:
  - `scripts/harness/main.ts`

---

## 5. 修正済みスタブ（Wave 2B以降の実装差し替え）

### STUB-06: `skill:execute-tdd-cycle` — `L1BiomeValidatorAdapter` 常に空violations返却
- **発見**: `skill:execute-tdd-cycle` の L1バリデーション（biome lint）が常にPASSしていた
- **原因**: `L1BiomeValidatorAdapter.validate()` が `// Stub implementation` コメントのまま `return []` を返すスタブ
- **修正**: `createBiomeAstEngineModule(process.cwd()).executeLintUseCase.execute()` を呼び出し、violationsを `ValidationViolation[]` にマップ
- **影響ファイル**:
  - `scripts/harness/skill-quality/infrastructure/adapters/l1-biome-validator-adapter.ts`

---

## 6. 修正済みスタブ（Wave 3バグ修正・2026-03-22）

### STUB-07: `skill:execute-tdd-cycle` — `L2ValidatorSystemAdapter` 常に空violations返却
- **修正**: `createValidatorSystemModule().runL2ValidatorsUseCase.execute()` に差し替え
- **影響ファイル**: `scripts/harness/skill-quality/infrastructure/adapters/l2-validator-system-adapter.ts`

### STUB-08: `validate --layer L2` — `BiomeAstSourceCodeAnalyzerAdapter` スタブ
- **修正**: TypeScript Compiler API（`ts.createProgram`）を使用した正確なエクスポート抽出に差し替え
- **影響ファイル**: `scripts/harness/validator-system/infrastructure/adapters/biome-ast-source-code-analyzer-adapter.ts`

### STUB-09: `validate --layer L3` — `MarkdownDesignDocumentAdapter` スタブ
- **修正**: Markdown正規表現パースによる設計文書読み取り・要素名抽出に差し替え
- **影響ファイル**: `scripts/harness/validator-system/infrastructure/adapters/markdown-design-document-adapter.ts`

### STUB-10: `validate --layer L2` — `AdrFoundationReferenceAdapter` スタブ
- **修正**: `createAdrFoundationModule()` 経由でADR実在性を確認する実実装に差し替え
- **影響ファイル**: `scripts/harness/validator-system/infrastructure/adapters/adr-foundation-reference-adapter.ts`

### STUB-11: `skill:check-coverage` — `PlanCheckExecutorPort` 常に100%返却
- **修正**: チェックボックス解析ベースの `PlanCheckExecutorImpl` に差し替え
- **影響ファイル**: `scripts/harness/skill-quality/composition-root.ts`

---

## 7. 修正済みアーキテクチャ制約（2026-03-22）

### ARCH-01: `validate` L2/L3/L4 — バリデータが実際のチェックを行わない（修正済み）
- **修正**: overrideMap パターンで全バリデータに実チェックを接続
  - L2-003: `BiomeAstTestQualityAnalyzerAdapter`（日本語テスト名・actual変数チェック）
  - L3-001: `FileSystemSecurityPatternScannerAdapter`（ハードコード秘密情報検出）
  - L3-002: `AstPerformanceScannerAdapter`（TypeScript AST await-in-loop + bundle size）
  - L4-001: `DriftDetectionService`（設計⇔コード双方向乖離検出）
  - L4-002: `ConsistencyCheckService`（設計文書間レイヤー整合性検証）
  - L4-003: `DeadCodeDetectionService`（未使用エクスポート・到達不能コード検出）
- **影響ファイル**:
  - `scripts/harness/validator-system/application/use-cases/run-l2-validators-usecase.ts`
  - `scripts/harness/validator-system/application/use-cases/run-l3-validators-usecase.ts`
  - `scripts/harness/validator-system/application/use-cases/run-l4-validators-usecase.ts`
  - `scripts/harness/validator-system/composition-root.ts`

### ARCH-02: `regression:run-k-requirements` / `gng-gate` / `k14-k15` — テストデータなし（修正済み）
- **発見**: `0/0 passed` を返す
- **原因**: `docs/inception/` 配下に k-requirements / GnG gate / K14-K15 テストデータが未作成
- **修正**: テストデータが追加され、全 regression テストが pass するようになった
- **確認結果（2026-03-22）**: regression:run-k-requirements 16/16 pass / regression:run-gng-gate 3/3 pass / regression:run-k14-k15 2/2 pass
- **ステータス**: 修正済み ✅

### ARCH-03: `skill:execute-tdd-cycle` — ステージングなし時にコミット失敗（修正済み）
- **修正**: `GitCommitExecutorAdapter` の "nothing to commit" エラーメッセージを日本語の分かりやすい説明に変更
- **影響ファイル**: `scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts`

---

## 8. スキル帰属判定（v1 MVH スコープ確認）

### SCOPE-01: milestone-manager → Orchestration パッケージに移管
- **根拠**: product_overview.md Section 1.4 で「Milestone/ロードマップ管理」がオーケストレーション側に明記
- **対応**: v1 Quality Harness スコープ外。Orchestration パッケージで対応

### SCOPE-02: scope-manager → Orchestration パッケージに移管
- **根拠**: 要件スコープの管理はオーケストレーション（セッション管理・コンテキスト管理）に類する
- **対応**: v1 Quality Harness スコープ外。Orchestration パッケージで対応

### SCOPE-03: codebase-mapper → Phase 2 スコープ
- **根拠**: コードベース構造マップの生成は L4 バリデータの入力強化として有用だが、現在 `BiomeAstSourceCodeAnalyzerAdapter` が部分的に機能を担っている
- **対応**: Phase 2 で L4 バリデータの入力精度向上とともに実装

---

## 9. 問題なし（誤検知）

### OK-01: `regression:run-agent-guard` — 3/3 PASS
- 3件の実エージェント独立性テストが正常動作

### OK-02: `lint` 全体スキャン — 1648 violations
- Biome CLIが1249ファイルをスキャンし実際の違反を検出。これはコードベースに存在する実際の L1 ルール違反（主に `__tests__/fixtures/` の意図的なサンプルファイル）

### OK-03: `p2:validate-pointers` — 155 broken
- 実際に存在しないファイルへのポインタをドキュメント中から検出している（本物の動作）
