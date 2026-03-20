# テストカバレッジ計画: quick-mode

> **作成日**: 2026-03-19
> **対象Unit**: quick-mode
> **対応ストーリー**: H10-01, H10-02, H10-03
> **Wave**: 2（コア品質機構）
> **成果物**: `docs/product/construction/quick-mode/coverage_report.md`

---

## 1. 計画概要

quick-mode Unitのテスト設計文書（unit_test_design.md / it_test_design.md）が対象受け入れ基準とドメインロジックを適切にカバーしているかを検証する。特に3拒否ルール（MIXED_CHANGES / NEW_DOMAIN / API_CONTRACT）の評価順序と不変条件（INV系）のカバー状況に重点を置く。

---

## 2. 検証対象ドキュメント

| ドキュメント | パス |
|------------|------|
| 受け入れ基準 | `docs/product/units/quick_mode_unit.md` |
| ドメインモデル | `docs/product/construction/quick-mode/domain_model.md` |
| 論理設計 | `docs/product/construction/quick-mode/logical_design.md` |
| ユニットテスト設計 | `docs/product/construction/quick-mode/unit_test_design.md` |
| ITテスト設計 | `docs/product/construction/quick-mode/it_test_design.md` |
| 統合契約（参考） | `docs/product/units/integration_contract.md` |

---

## 3. 検証観点

### 3.1 受け入れ基準カバレッジ

`quick_mode_unit.md §3` の機能要件（H10-01〜H10-03）に記載された各条件に対応するテストケースの存在確認。

### 3.2 ドメインロジックカバレッジ

`domain_model.md §5` の不変条件（INV-1〜INV-6、INV-E1〜E3、INV-P1〜P6、INV-D1〜D2）と3拒否ルールの評価順序（MIXED_CHANGES → NEW_DOMAIN → API_CONTRACT）のテストカバー状況。

### 3.3 UseCaseカバレッジ

`logical_design.md §4` の各UseCase（JudgeQuickModeEligibilityUseCase / BuildRelaxationProfileUseCase / ExecuteQuickCiCheckUseCase）の正常系・異常系カバー状況。

### 3.4 APIカバレッジ

`logical_design.md §6` のCLIハンドラー・フォーマッター（CiCheckQuickModeHandler / HumanQuickModeFormatter / AgentQuickModeFormatter / JsonQuickModeFormatter）のカバー状況。

### 3.5 Engineering Perspective評価

テスト設計文書に対してケント・ベック / マーティン・ファウラー / アンクル・ボブ / エリック・エヴァンスの4視点で定性評価を行う。

---

## 4. 分析手順

1. 受け入れ基準（AC）一覧を抽出し、テストケースIDとの1:Nマッピングを作成する
2. ドメインモデルの不変条件一覧を抽出し、対応UT/ITケースを特定する
3. UseCase3本のテスト網羅率（正常系/3拒否ルール/異常系）を確認する
4. Handler/Formatter 4コンポーネントのテスト網羅率を確認する
5. 4視点の Engineering Perspective 評価を実施する
6. 未カバー項目を抽出し優先度（High/Medium/Low）を付与する
7. 推奨追加ケースを具体的なケースIDと内容で提案する

---

## 5. 成果物フォーマット

`docs/product/construction/quick-mode/coverage_report.md` に以下セクションで出力する:

1. サマリー（数値概観）
2. 受け入れ基準カバレッジ詳細（AC別マッピング表）
3. ドメインロジックカバレッジ詳細（不変条件別マッピング表）
4. UseCaseカバレッジ詳細（UseCase別正常系/異常系カバー表）
5. APIカバレッジ詳細（Handler/Formatter別カバー表）
6. Engineering Perspective 評価（4視点）
7. 未カバー項目一覧（優先度付き）
8. 推奨追加ケース
9. 次のアクション

---

## 6. BLOCK基準

以下のいずれかが満たされない場合は coverage_report.md の作成を中断し人間に報告する:

- `quick_mode_unit.md` が存在しない（受け入れ基準不在）
- `domain_model.md` が存在しない（不変条件参照不可）
- `unit_test_design.md` / `it_test_design.md` のいずれかが存在しない（テスト設計不在）

**現時点での判定**: 全ドキュメントが存在するため BLOCK なし。Phase 2 実行可能。
