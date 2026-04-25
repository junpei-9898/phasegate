# シナリオテスト設計: H10-02 — Quick Mode判定エンジン

> **Unit ID**: quick-mode
> **ストーリーID**: H10-02
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

H10-02はH10-01の後続処理として呼ばれる `BuildRelaxationProfileUseCase` および `ValidatorRelaxationService` が主テスト対象。eligible=trueが確定した後に `ValidatorRelaxationProfile` を生成する。

- `ValidatorRelaxationService.build()`: QuickModeConfig + 全ValidatorId一覧 → ValidatorRelaxationProfile
- `BuildRelaxationProfileUseCase`: eligible=falseの場合は即時エラー、eligible=trueの場合のみプロファイル生成
- `ValidatorSystemValidatorIdRegistryAdapter`: L1-001〜L4-003の静的ValidatorId一覧を返す

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H10-02-001 | eligible=trueの場合にValidatorRelaxationProfileが生成される | eligibility={eligible:true} | relaxationProfile が非undefined |
| SC-H10-02-002 | デフォルト設定でL1は全維持される | デフォルトQuickModeConfig | l1.all=true |
| SC-H10-02-003 | デフォルト設定でL2-001（phase-gate）がスキップされる | デフォルトQuickModeConfig | l2.skipped=['L2-001'] |
| SC-H10-02-004 | デフォルト設定でL2-002,L2-003が維持される | デフォルトQuickModeConfig | l2.maintained=['L2-002','L2-003'] |
| SC-H10-02-005 | デフォルト設定でL3-001（security）のみ維持される | デフォルトQuickModeConfig | l3.maintained=['L3-001'] |
| SC-H10-02-006 | デフォルト設定でL4は全スキップされる | デフォルトQuickModeConfig | l4.all=false |
| SC-H10-02-007 | levelDependencyRelaxedは常にfalseである | 任意のQuickModeConfig | levelDependencyRelaxed=false |
| SC-H10-02-008 | twoPhaseRequiredは常にfalseである | 任意のQuickModeConfig | phaseExecution.twoPhaseRequired=false |
| SC-H10-02-009 | eligible=falseの入力でQuickModeNotEligibleErrorが投げられる | eligibility={eligible:false} | QuickModeNotEligibleError |
| SC-H10-02-010 | ValidatorIdRegistryAdapterが全ValidatorId（L1-001〜L4-003）を返す | なし | 静的ID一覧15件 |

## 3. テスト配置
- ユニットテスト: `scripts/harness/__tests__/unit/quick-mode/domain/services/validator-relaxation-service.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/quick-mode/application/usecases/build-relaxation-profile-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/quick-mode/validator-system-validator-id-registry-adapter.test.ts`

## 4. 前提条件
- H10-01（JudgeQuickModeEligibilityUseCase）が完了していること
- eligible=trueのQuickModeEligibilityContractが入力として得られていること
