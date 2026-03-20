# ユニットテストロジック設計計画: quick-mode

> **作成日**: 2026-03-19
> **Wave**: 2

## 1. スコープ

- **対象**: `docs/product/construction/quick-mode/unit_test_design.md`
- **テストケース総数**: 150件（VO×7 80件 + DS×2 28件 + UseCase×3 34件 + Mapper 8件）
- **実装先ソース**: `scripts/harness/` 配下（Wave 2新規 Unit）

## 2. テストファイル構成（計画）

unit_test_design.md §2 で指定されたネスト構造を採用する。

| テストファイル | 対象クラス | ケース数 |
|--------------|----------|---------|
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/quick-mode-config.test.ts` | QuickModeConfig | 14 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/changed-file.test.ts` | ChangedFile | 12 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/change-category.test.ts` | ChangeCategory | 10 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/change-classification.test.ts` | ChangeClassification | 10 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/quick-mode-eligibility.test.ts` | QuickModeEligibility | 12 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/validator-relaxation-profile.test.ts` | ValidatorRelaxationProfile | 14 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/quick-mode-decision.test.ts` | QuickModeDecision | 8 |
| `scripts/harness/__tests__/unit/quick-mode/domain/services/quick-mode-judgment-engine.test.ts` | QuickModeJudgmentEngine | 20 |
| `scripts/harness/__tests__/unit/quick-mode/domain/services/validator-relaxation-service.test.ts` | ValidatorRelaxationService | 8 |
| `scripts/harness/__tests__/unit/quick-mode/application/usecases/judge-quick-mode-eligibility-usecase.test.ts` | JudgeQuickModeEligibilityUseCase | 14 |
| `scripts/harness/__tests__/unit/quick-mode/application/usecases/build-relaxation-profile-usecase.test.ts` | BuildRelaxationProfileUseCase | 10 |
| `scripts/harness/__tests__/unit/quick-mode/application/usecases/execute-quick-ci-check-usecase.test.ts` | ExecuteQuickCiCheckUseCase | 10 |
| `scripts/harness/__tests__/unit/quick-mode/application/mappers/quick-mode-decision-contract-mapper.test.ts` | QuickModeDecisionContractMapper | 8 |

## 3. モック/ファクトリ設計方針

### ファクトリ関数配置

`scripts/harness/__tests__/helpers/test-helpers.ts` に追加：

- `createChangedFile(filePath?, changeKind?)`: デフォルト `{ filePath: "scripts/harness/quick-mode/services/quick-service.ts", changeKind: "MODIFY" }`
- `createQuickModeConfig(overrides?)`: デフォルト `{ allowedCategories: ["bugfix","docs","test","config"], maintainedLayers: ["L1"], relaxedGates: ["L2-001"] }`
- `createQuickModeEligibility(eligible?)`: eligible=true のデフォルトインスタンス
- `createValidatorRelaxationProfile()`: デフォルトプロファイル（`ValidatorRelaxationProfile.createDefault()` 利用）
- `createQuickModeDecision(approved?)`: デフォルト approved=true

### モック方針

- **VO・ドメインサービス**: モック不使用（実体を使用）
- **UseCase層のPort**: `vi.fn()` でモック
  - `ChangedFilesPort`, `QuickModeConfigPort`, `ValidatorIdRegistryPort`
  - `ValidatorExecutionPort`（ExecuteQuickCiCheckUseCaseで新規追加）
- **UseCase間依存** (`ExecuteQuickCiCheckUseCase` → `JudgeUseCase`, `BuildUseCase`): `vi.fn()` のテストダブルを使用
- `ChangeClassification` は `QuickModeJudgmentEngine.classify()` の返り値を通じて間接検証

## 4. QA（不明点・確認事項）

なし

## 5. 前提条件・リスク

- `ValidatorRelaxationProfile` の不変条件 INV-P5/P6 は L2/L3 の全 ValidatorId の集合整合性チェックを行う
  - L2: `{L2-001, L2-002, L2-003}` の完全性
  - L3: `{L3-001, L3-002, L3-003, L3-004}` の完全性
- `ExecuteQuickCiCheckUseCase` の `ValidatorExecutionPort.executeWithProfile` はポートモックのスパイで検証（呼ばれた/呼ばれていないの確認）
- `ChangeClassification` は独立した生成コンストラクタを持たず、`QuickModeJudgmentEngine.classify()` の返り値として取得する設計
