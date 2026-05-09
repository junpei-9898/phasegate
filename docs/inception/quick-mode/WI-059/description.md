---
id: WI-059
type: story
severity: normal
status: tested
legacy_id: H10-05
---

# H10-05

## 完了メモ

- Quick Mode の config 駆動化と `check-change-category` CLI は実装済み。
- 関連実装は `QuickModeConfig.fullModeRequiredWhen`, `ClassifyChangeCategoryUseCase`, `CheckChangeCategoryHandler` 系に反映済み。
- 関連テストは quick-mode の `fullModeRequiredWhen`, `classify-change-category`, `check-change-category-handler` 系で検証する。
