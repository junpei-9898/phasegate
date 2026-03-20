# 論理設計計画: quick-mode
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20
**対応Unit**: quick-mode

## 1. スコープ
- 対象Unit: quick-mode
- 影響するストーリー: H10-01, H10-02, H10-03, H10-04

## 2. 設計方針

`docs/product/construction/quick-mode/logical_design.md` に記録された主要設計判断:

- **ステートレス判定エンジン**: quick-modeは集約を持たない。ドメインロジックは値オブジェクトとドメインサービスで完結する純粋な計算処理（ChangedFile[] + QuickModeConfig → QuickModeDecision）
- **3拒否ルールのハードコード**: MIXED_CHANGES / NEW_DOMAIN / API_CONTRACT は `allowedCategories` 設定で上書きできない不変条件。K6「ゲート緩和圧力への防波堤」対応
- **2段階UseCase構造**: H10-01（JudgeQuickModeEligibilityUseCase）→ H10-02（BuildRelaxationProfileUseCase）→ H10-03（ExecuteQuickCiCheckUseCase）の順でUseCaseが対応
- **ValidatorIdRegistryPort静的実装**: Wave 2ではintegration_contract.md §9の確定ID一覧（L1-001〜L4-003）を静的定義として保持。Port/Adapterパターンにより後から差し替え可能
- **ChangedFile.filePathをローカルVOに限定**: Shared Kernel最小化（cross_cutting_decisions.md §4）に従い、biome-ast-engineのFilePathに依存しない

## 3. 採用パターン
- Hexagonal Architecture（Port & Adapter）
- domain → application → infrastructure → presentation
- ドメインサービス2本: QuickModeJudgmentEngine（分類・判定）、ValidatorRelaxationService（緩和プロファイル生成）
- Shared Kernel公開面は `scripts/harness/shared-kernel/quick-mode.ts` への再エクスポートのみ
- リスク優先度によるファイルカテゴリ分類: `api` > `domain` > `feature` > `bugfix` > `test` > `config` > `docs`
- ValidatorRelaxationProfileのリテラル型強制: `levelDependencyRelaxed: false`、`l1.all: true`、`l4.all: false` を型システムで保証

## 4. QA
なし（実装完了後の遡及記録）
