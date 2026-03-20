# ユニットテスト設計計画: quick-mode

> **作成日**: 2026-03-19
> **対応ストーリー**: H10-01〜H10-03
> **前提ドキュメント**: `domain_model.md`、`logical_design.md`、`docs/principles/testing-rules.md`

---

## 1. スコープ

- 対象Unit: quick-mode（Wave 2）
- `domain_model.md §2`「Aggregate Boundary」の判断に従い、集約なし（ステートレス判定エンジン）
- テスト対象: 値オブジェクト7種 + ドメインサービス2種
- Application層（UseCase × 3 + Mapper × 1）もユニットテスト対象に含める（`logical_design.md §10.1`）
- Presentation層（Formatter × 3 + Handler × 1）もユニットテスト対象に含める（同上）

### テスト対象コンポーネント一覧

| 分類 | コンポーネント | テストファイル |
|------|-------------|-------------|
| 値オブジェクト | QuickModeConfig | quick-mode-config.test.ts |
| 値オブジェクト | ChangedFile | changed-file.test.ts |
| 値オブジェクト | ChangeCategory | change-category.test.ts |
| 値オブジェクト | ChangeClassification | change-classification.test.ts |
| 値オブジェクト | QuickModeEligibility | quick-mode-eligibility.test.ts |
| 値オブジェクト | ValidatorRelaxationProfile | validator-relaxation-profile.test.ts |
| 値オブジェクト | QuickModeDecision | quick-mode-decision.test.ts |
| ドメインサービス | QuickModeJudgmentEngine | quick-mode-judgment-engine.test.ts |
| ドメインサービス | ValidatorRelaxationService | validator-relaxation-service.test.ts |
| UseCaseクラス | JudgeQuickModeEligibilityUseCase | judge-quick-mode-eligibility-usecase.test.ts |
| UseCaseクラス | BuildRelaxationProfileUseCase | build-relaxation-profile-usecase.test.ts |
| UseCaseクラス | ExecuteQuickCiCheckUseCase | execute-quick-ci-check-usecase.test.ts |
| Mapper | QuickModeDecisionContractMapper | quick-mode-decision-contract-mapper.test.ts |

---

## 2. テスト対象分析

### 集約

集約なし。`domain_model.md §2`「集約なし（ステートレス判定エンジン）」として明示的に除外されている。

### エンティティ

エンティティなし。全概念が不変・値等価性を持つ値オブジェクトとして定義されている。

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| QuickModeConfig | 4（allowedCategoriesの空禁止、domain/api/feature含有禁止、isMaintained/isRelaxed/isAllowed動作、equals） | 14 |
| ChangedFile | 3（filePath空文字禁止、末尾スラッシュ禁止、changeKind正規値のみ）+ メソッド4種 | 12 |
| ChangeCategory | 2（7値のみ許容、大文字小文字正規化）+ isQuickModeRejectable + fromString | 10 |
| ChangeClassification | 3（dominantCategoryリスク順、getFiles/hasCategory/hasAnyRejectable、equals） | 10 |
| QuickModeEligibility | 3（INV-E1〜E3）+ ファクトリメソッド2種 + isEligible | 12 |
| ValidatorRelaxationProfile | 6（INV-P1〜P6）+ ファクトリメソッド2種 + isMaintained/isSkipped | 14 |
| QuickModeDecision | 2（INV-D1〜D2）+ ファクトリメソッド2種 + isApproved | 8 |

### ドメインサービス

| サービス名 | メソッド数 | テストケース概算 |
|-----------|----------|---------------|
| QuickModeJudgmentEngine | classify() × 8件、judge() × 12件 | 20 |
| ValidatorRelaxationService | build() × 8件 | 8 |

---

## 3. テスト方針

### 正常系/異常系のバランス

- **値オブジェクト**: 正常生成1〜2件 + 各制約の異常系を網羅。不変条件（INV系）の検証を重点的に行う
- **ドメインサービス**: 正常系2〜3件（allowedCategories内のみ、各拒否ルール通過）+ 3拒否ルールの各パターン（MIXED_CHANGES/NEW_DOMAIN/API_CONTRACT）を独立検証
- **UseCase**: Portをモック化し、3拒否ルールそれぞれのパス + 正常パスの計4パターン以上をカバー

### 境界値テストの対象

| 対象 | 境界値 |
|------|--------|
| QuickModeConfig.allowedCategories | 空配列（エラー）、'domain'/'api'/'feature'含有（エラー） |
| ChangedFile.filePath | 空文字（エラー）、末尾スラッシュ（エラー）、正規化済み相対パス（正常） |
| ChangeCategory | 7値の全パターン、8個目（UnknownChangeCategoryError） |
| ChangeClassification.dominantCategory | 全ファイルがallowed内（null? or dominantCategory正常）、1件でもapi含む（api） |
| QuickModeEligibility（eligible=false時） | rejectedFiles空配列（エラー）、1件以上（正常） |
| ValidatorRelaxationProfile | L2のmaintained∪skipped = {L2-001, L2-002, L2-003}の完全一致確認 |
| ChangedFile[] 空配列 | JudgmentEngine.judge()がeligible=trueを返すこと |

### テスト規約の適用

- **ドメイン実体のモック禁止**: 値オブジェクト（QuickModeConfig、ChangedFile等）は全て実体を使用。ドメインサービスも実体を使用
- **モック対象**: UseCase層のテストでは Port（ChangedFilesPort、QuickModeConfigPort、ValidatorIdRegistryPort）のみモック化
- **AAAパターン**: Arrange / Act / Assert を明示コメントで記述。Actは1回、結果は`actual`に代入
- **テストケース名は日本語**: 仕様書としての表現力を重視
- **target/describe/context/it構造**: テスト規約の構造パターンを厳守

### describe/it構造の例

```
target('judge', () => {
  describe('変更ファイル群の分類と3拒否ルール評価を行い、Quick Mode適用可否を返す', () => {
    context('全ファイルがallowedCategories内のみで構成される場合', () => {
      it('eligible=trueのQuickModeEligibilityが返ること', () => {});
    });
    context('allowedCategories外のファイルが1件含まれる場合', () => {
      it('MIXED_CHANGESルールで拒否されること', () => {});
    });
    context('domain/配下にchangeKind=CREATEのファイルが含まれる場合', () => {
      it('NEW_DOMAINルールで拒否されること', () => {});
    });
    context('*port.tsのファイルが含まれる場合', () => {
      it('API_CONTRACTルールで拒否されること', () => {});
    });
  });
});
```

---

## 4. QA（不明点・確認事項）

なし。`domain_model.md`および`logical_design.md`の記述で十分なテスト設計が可能。

- ChangeClassificationは`QuickModeJudgmentEngine`内部でのみ生成するため（直接インスタンス化禁止）、ChangeClassificationのユニットテストはJudgmentEngine経由で行うか、テスト専用ファクトリを用意するかを選択する。今回は設計文書のみのため、JudgmentEngineのテスト内で間接的に検証する設計とする
- QuickModeDecisionのユニットテストは`approved()` / `rejected()` ファクトリメソッドを直接呼ぶ形で実施する

---

## 5. 前提条件・リスク

### 前提条件

- テストフレームワーク: Vitest 3.0.0
- UseCase層のテストではPort（ChangedFilesPort、QuickModeConfigPort、ValidatorIdRegistryPort）をモック化して使用する
- HarnessError型はharness-error Unitから提供される型定義が利用可能であること
- ChangeClassificationは直接テスト可能なファクトリが存在しないため、JudgmentEngine.classify()経由での検証をメインとする

### リスク

| リスク | 影響 | 緩和策 |
|--------|------|--------|
| ChangeClassificationの直接インスタンス化禁止 | VOとしての単独テストができない | JudgmentEngine.classify()の返り値を通じてChangeClassificationの振る舞いを間接検証する |
| ValidatorIdRegistryPort静的実装 | モック不要だが、ValidatorRelaxationServiceのテストでは全ValidatorId配列を直接渡すことで対応 | allValidatorIds配列をテスト内でArrangeとして構築する |

### テストケース総数概算

- 値オブジェクト: 80件
- ドメインサービス: 28件
- Application UseCase + Mapper: 38件
- **合計: 約146件**
