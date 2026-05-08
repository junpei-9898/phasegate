---
traceability:
  initial_creation: true
---

# ユニットテスト設計: quick-mode

> **作成日**: 2026-03-19
> **対応ストーリー**: H10-01, H10-02, H10-03
> **前提ドキュメント**: `domain_model.md`、`logical_design.md`、`unit_test_design_plan.md`
> **テストフレームワーク**: Vitest 3.0.0

---

## 1. 対象ドメインモデル

### スコープ

quick-mode は集約・エンティティを持たない。`domain_model.md §2`「集約なし（ステートレス判定エンジン）」に基づき、値オブジェクト + ドメインサービス + Application層 UseCase / Mapper をテスト対象とする。

### テスト対象一覧

| 分類 | コンポーネント | テストケース数 |
|------|-------------|-------------|
| 値オブジェクト | QuickModeConfig | 14 |
| 値オブジェクト | ChangedFile | 12 |
| 値オブジェクト | ChangeCategory | 10 |
| 値オブジェクト | ChangeClassification | 10 |
| 値オブジェクト | QuickModeEligibility | 12 |
| 値オブジェクト | ValidatorRelaxationProfile | 14 |
| 値オブジェクト | QuickModeDecision | 8 |
| ドメインサービス | QuickModeJudgmentEngine | 20 |
| ドメインサービス | ValidatorRelaxationService | 8 |
| UseCaseクラス | JudgeQuickModeEligibilityUseCase | 14 |
| UseCaseクラス | BuildRelaxationProfileUseCase | 10 |
| UseCaseクラス | ExecuteQuickCiCheckUseCase | 10 |
| Mapper | QuickModeDecisionContractMapper | 8 |
| **合計** | **13ファイル** | **150件** |

### モック方針

- **Domain層の値オブジェクト・サービス**: モック禁止。全て実体を使用する
- **UseCase層のテストでモック対象**: ChangedFilesPort、QuickModeConfigPort、ValidatorIdRegistryPort
- **UseCase同士**: ExecuteQuickCiCheckUseCaseのテストでは JudgeQuickModeEligibilityUseCase / BuildRelaxationProfileUseCase のテストダブルを使用可

---

## 2. テストファイル構成

```text
scripts/harness/__tests__/unit/quick-mode/
├── domain/
│   ├── value-objects/
│   │   ├── quick-mode-config.test.ts
│   │   ├── changed-file.test.ts
│   │   ├── change-category.test.ts
│   │   ├── change-classification.test.ts
│   │   ├── quick-mode-eligibility.test.ts
│   │   ├── validator-relaxation-profile.test.ts
│   │   └── quick-mode-decision.test.ts
│   └── services/
│       ├── quick-mode-judgment-engine.test.ts
│       └── validator-relaxation-service.test.ts
└── application/
    ├── usecases/
    │   ├── judge-quick-mode-eligibility-usecase.test.ts
    │   ├── build-relaxation-profile-usecase.test.ts
    │   └── execute-quick-ci-check-usecase.test.ts
    └── mappers/
        └── quick-mode-decision-contract-mapper.test.ts
```

全ファイル名はkebab-caseとする（テスト規約準拠）。

---

## 3. 値オブジェクトテストケース

### 3.1 QuickModeConfig（14件）

#### 制約テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-QMC-001 | create | QuickModeConfigを生成する | 正常な入力が渡された場合 | allowedCategories/maintainedLayers/relaxedGatesが設定されたQuickModeConfigが生成されること |
| UT-QMC-002 | create | QuickModeConfigを生成する | allowedCategoriesに空配列が渡された場合 | QuickModeConfigErrorが発生すること |
| UT-QMC-003 | create | QuickModeConfigを生成する | allowedCategoriesに'domain'が含まれる場合 | QuickModeConfigErrorが発生すること |
| UT-QMC-004 | create | QuickModeConfigを生成する | allowedCategoriesに'api'が含まれる場合 | QuickModeConfigErrorが発生すること |
| UT-QMC-005 | create | QuickModeConfigを生成する | allowedCategoriesに'feature'が含まれる場合 | QuickModeConfigErrorが発生すること |

#### メソッドテスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-QMC-006 | isAllowed | 指定カテゴリがallowedCategoriesに含まれるか判定する | allowedCategoriesに'bugfix'が含まれる場合 | trueが返ること |
| UT-QMC-007 | isAllowed | 指定カテゴリがallowedCategoriesに含まれるか判定する | allowedCategoriesに'docs'が含まれない場合 | falseが返ること |
| UT-QMC-008 | isMaintained | 指定ValidatorIdがmaintainedLayersに含まれるか判定する | maintainedLayersに'L1'が含まれる場合 | trueが返ること |
| UT-QMC-009 | isMaintained | 指定ValidatorIdがmaintainedLayersに含まれるか判定する | maintainedLayersに'L2-001'が含まれない場合 | falseが返ること |
| UT-QMC-010 | isRelaxed | 指定ValidatorIdがrelaxedGatesに含まれるか判定する | relaxedGatesに'L2-001'が含まれる場合 | trueが返ること |
| UT-QMC-011 | isRelaxed | 指定ValidatorIdがrelaxedGatesに含まれるか判定する | relaxedGatesに'L3-001'が含まれない場合 | falseが返ること |
| UT-QMC-012 | equals | 2つのQuickModeConfigの値等価性を判定する | 同一の設定値を持つ2つのインスタンスの場合 | trueが返ること |
| UT-QMC-013 | equals | 2つのQuickModeConfigの値等価性を判定する | allowedCategoriesが異なる2つのインスタンスの場合 | falseが返ること |
| UT-QMC-014 | create | QuickModeConfigを生成する | 生成後にObject.freeze()が適用されている場合 | プロパティへの再代入が無視（またはエラー）となること |

---

### 3.2 ChangedFile（12件）

#### 制約テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-CF-001 | create | ChangedFileを生成する | 正常なfilePathとchangeKindが渡された場合 | ChangedFileが生成されること |
| UT-CF-002 | create | ChangedFileを生成する | filePathが空文字の場合 | エラーが発生すること |
| UT-CF-003 | create | ChangedFileを生成する | filePathが末尾スラッシュを含む場合 | エラーが発生すること |
| UT-CF-004 | create | ChangedFileを生成する | changeKindが'CREATE'/'MODIFY'/'DELETE'以外の場合 | エラーが発生すること |

#### メソッドテスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-CF-005 | isUnder | filePathが指定ディレクトリ配下かを判定する | 'scripts/harness/quick-mode/domain/'で始まるfilePathの場合 | trueが返ること |
| UT-CF-006 | isUnder | filePathが指定ディレクトリ配下かを判定する | 一致しないディレクトリプレフィックスの場合 | falseが返ること |
| UT-CF-007 | hasExtension | 指定拡張子との一致を判定する | '.ts'拡張子を持つfilePathの場合 | trueが返ること |
| UT-CF-008 | hasExtension | 指定拡張子との一致を判定する | '.json'拡張子を持つfilePathの場合 | '.ts'指定ではfalseが返ること |
| UT-CF-009 | matchesPattern | glob/suffixパターンとの一致を判定する | '*port.ts'パターンに一致するfilePathの場合 | trueが返ること |
| UT-CF-010 | matchesPattern | glob/suffixパターンとの一致を判定する | '*adapter.ts'パターンに一致しないfilePathの場合 | falseが返ること |
| UT-CF-011 | equals | 2つのChangedFileの値等価性を判定する | 同一filePath/changeKindを持つ2つのインスタンスの場合 | trueが返ること |
| UT-CF-012 | equals | 2つのChangedFileの値等価性を判定する | filePathが異なる2つのインスタンスの場合 | falseが返ること |

---

### 3.3 ChangeCategory（10件）

#### 制約テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-CC-001 | fromString | 文字列からChangeCategoryを生成する | 正規7値（'bugfix'/'docs'/'test'/'config'/'feature'/'domain'/'api'）が渡された場合 | 対応するChangeCategoryが生成されること |
| UT-CC-002 | fromString | 文字列からChangeCategoryを生成する | 大文字（'BUGFIX'）が渡された場合 | 大文字小文字を正規化してChangeCategoryが生成されること |
| UT-CC-003 | fromString | 文字列からChangeCategoryを生成する | 定義外の文字列が渡された場合 | UnknownChangeCategoryErrorが発生すること |

#### メソッドテスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-CC-004 | isQuickModeRejectable | Quick Mode拒否対象カテゴリかを判定する | 'domain'の場合 | trueが返ること |
| UT-CC-005 | isQuickModeRejectable | Quick Mode拒否対象カテゴリかを判定する | 'api'の場合 | trueが返ること |
| UT-CC-006 | isQuickModeRejectable | Quick Mode拒否対象カテゴリかを判定する | 'feature'の場合 | trueが返ること |
| UT-CC-007 | isQuickModeRejectable | Quick Mode拒否対象カテゴリかを判定する | 'bugfix'の場合 | falseが返ること |
| UT-CC-008 | isQuickModeRejectable | Quick Mode拒否対象カテゴリかを判定する | 'docs'/'test'/'config'の場合 | falseが返ること |
| UT-CC-009 | toString | ChangeCategoryを文字列に変換する | 'bugfix'のChangeCategoryの場合 | 'bugfix'が返ること |
| UT-CC-010 | equals | 2つのChangeCategoryの等価性を判定する | 同一値の2つのインスタンスの場合 | trueが返ること |

---

### 3.4 ChangeClassification（10件）

ChangeClassificationはQuickModeJudgmentEngine内部でのみ生成されるため、classify()の返り値を通じて振る舞いを検証する。

#### メソッドテスト（classify()戻り値を通じた検証）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-CCLS-001 | getFiles | 指定カテゴリのファイル一覧を返す | 'docs'カテゴリのファイルが含まれる分類結果の場合 | 対応するChangedFile[]が返ること |
| UT-CCLS-002 | getFiles | 指定カテゴリのファイル一覧を返す | 指定カテゴリのファイルが存在しない場合 | 空配列が返ること |
| UT-CCLS-003 | hasCategory | 指定カテゴリが含まれるかを判定する | 'domain'カテゴリのファイルが含まれる場合 | trueが返ること |
| UT-CCLS-004 | hasCategory | 指定カテゴリが含まれるかを判定する | 'api'カテゴリのファイルが含まれない場合 | falseが返ること |
| UT-CCLS-005 | hasAnyRejectable | 拒否対象カテゴリが含まれるかを判定する | 'domain'/'api'/'feature'のいずれかが含まれる場合 | trueが返ること |
| UT-CCLS-006 | hasAnyRejectable | 拒否対象カテゴリが含まれるかを判定する | 全ファイルが'bugfix'/'docs'/'test'/'config'のみの場合 | falseが返ること |
| UT-CCLS-007 | dominantCategory | 最高リスクカテゴリが正しく選択される | 'api'と'domain'が混在する場合 | dominantCategoryが'api'であること |
| UT-CCLS-008 | dominantCategory | 最高リスクカテゴリが正しく選択される | 'domain'と'bugfix'が混在する場合 | dominantCategoryが'domain'であること |
| UT-CCLS-009 | dominantCategory | 最高リスクカテゴリが正しく選択される | 全ファイルがallowed内（'bugfix'のみ）の場合 | dominantCategoryが拒否対象を示さないこと |
| UT-CCLS-010 | equals | 2つのChangeClassificationの値等価性を判定する | 同一の分類結果を持つ2つのインスタンスの場合 | trueが返ること |

---

### 3.5 QuickModeEligibility（12件）

#### 不変条件テスト（INV-E1〜E3）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-QME-001 | eligible | eligible=trueのQuickModeEligibilityを生成する | 正常なreason文字列が渡された場合 | eligible=true、rejectionRule=undefined、rejectedFiles=undefinedのインスタンスが生成されること |
| UT-QME-002 | eligible | eligible=trueのQuickModeEligibilityを生成する | reasonが空文字の場合 | エラーが発生すること（INV-E3） |
| UT-QME-003 | rejected | eligible=falseのQuickModeEligibilityを生成する | rejectionRuleとrejectedFilesが渡された場合 | eligible=false、rejectionRule非undefined、rejectedFiles非undefinedのインスタンスが生成されること |
| UT-QME-004 | rejected | eligible=falseのQuickModeEligibilityを生成する | rejectedFilesが空配列の場合 | エラーが発生すること（INV-E2） |
| UT-QME-005 | rejected | eligible=falseのQuickModeEligibilityを生成する | reasonが空文字の場合 | エラーが発生すること（INV-E3） |

#### メソッドテスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-QME-006 | isEligible | Quick Mode適用可否を返す | eligible=trueのインスタンスの場合 | trueが返ること |
| UT-QME-007 | isEligible | Quick Mode適用可否を返す | eligible=falseのインスタンスの場合 | falseが返ること |
| UT-QME-008 | equals | 2つのQuickModeEligibilityの値等価性を判定する | 同一eligible/reason/rejectionRuleを持つ場合 | trueが返ること |
| UT-QME-009 | equals | 2つのQuickModeEligibilityの値等価性を判定する | eligibleが異なる場合 | falseが返ること |

#### 不変条件の組み合わせテスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|----------|---------|------|---------|
| UT-QME-010 | INV-E1: eligible=trueのときrejectionRule===undefined | eligible=true生成後のrejectionRuleアクセス | undefinedが返ること |
| UT-QME-011 | INV-E1: eligible=trueのときrejectedFiles===undefined | eligible=true生成後のrejectedFilesアクセス | undefinedが返ること |
| UT-QME-012 | INV-E2: eligible=falseのときrejectedFiles.length >= 1 | rejected()で1件のrejectedFilesを渡す | rejectedFilesが1件含まれること |

---

### 3.6 ValidatorRelaxationProfile（14件）

#### 不変条件テスト（INV-P1〜P6）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-VRP-001 | createDefault | デフォルト緩和プロファイルを生成する | 引数なしで呼び出した場合 | levelDependencyRelaxed=false、l1.all=true、l4.all=false、phaseExecution.twoPhaseRequired=falseのプロファイルが生成されること |
| UT-VRP-002 | createDefault | デフォルト緩和プロファイルを生成する | デフォルトプロファイルのl2の場合 | maintained=[L2-002, L2-003]、skipped=[L2-001]であること |
| UT-VRP-003 | createDefault | デフォルト緩和プロファイルを生成する | デフォルトプロファイルのl3の場合 | maintained=[L3-001]、skipped=[L3-002, L3-003, L3-004]であること |
| UT-VRP-004 | create | カスタム緩和プロファイルを生成する | l2.maintained∪l2.skippedが{L2-001, L2-002, L2-003}に一致する場合 | ValidatorRelaxationProfileが生成されること（INV-P5） |
| UT-VRP-005 | create | カスタム緩和プロファイルを生成する | l2.maintained∪l2.skippedが{L2-001, L2-002, L2-003}に一致しない場合 | エラーが発生すること（INV-P5違反） |
| UT-VRP-006 | create | カスタム緩和プロファイルを生成する | l3.maintained∪l3.skippedが{L3-001, L3-002, L3-003, L3-004}に一致する場合 | ValidatorRelaxationProfileが生成されること（INV-P6） |
| UT-VRP-007 | create | カスタム緩和プロファイルを生成する | l3.maintained∪l3.skippedが{L3-001, L3-002, L3-003, L3-004}に一致しない場合 | エラーが発生すること（INV-P6違反） |

#### メソッドテスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-VRP-008 | isMaintained | 指定ValidatorIdが維持対象かを判定する | L2-002が指定された場合 | trueが返ること |
| UT-VRP-009 | isMaintained | 指定ValidatorIdが維持対象かを判定する | L2-001が指定された場合 | falseが返ること（スキップ対象） |
| UT-VRP-010 | isSkipped | 指定ValidatorIdがスキップ対象かを判定する | L2-001が指定された場合 | trueが返ること |
| UT-VRP-011 | isSkipped | 指定ValidatorIdがスキップ対象かを判定する | L3-001が指定された場合 | falseが返ること（維持対象） |
| UT-VRP-012 | equals | 2つのValidatorRelaxationProfileの値等価性を判定する | 同一設定の2つのインスタンスの場合 | trueが返ること |
| UT-VRP-013 | equals | 2つのValidatorRelaxationProfileの値等価性を判定する | l2.maintained が異なる2つのインスタンスの場合 | falseが返ること |

#### 不変条件の保護テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|----------|---------|------|---------|
| UT-VRP-014 | INV-P1: levelDependencyRelaxedは常にfalse | createDefault()の戻り値 | levelDependencyRelaxedがfalseであること |

---

### 3.7 QuickModeDecision（8件）

#### 不変条件テスト（INV-D1〜D2）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-QMD-001 | approved | 承認済みQuickModeDecisionを生成する | eligibility=trueとrelaxationProfileが渡された場合 | relaxationProfileが設定されたQuickModeDecisionが生成されること |
| UT-QMD-002 | rejected | 拒否済みQuickModeDecisionを生成する | eligibility=falseが渡された場合 | relaxationProfile=undefinedのQuickModeDecisionが生成されること（INV-D1） |
| UT-QMD-003 | approved | 承認済みQuickModeDecisionを生成する | eligible=falseのeligibilityが渡された場合 | エラーが発生すること（INV-D2の逆保証） |

#### メソッドテスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-QMD-004 | isApproved | Quick Mode承認状態を返す | approved()で生成したインスタンスの場合 | trueが返ること |
| UT-QMD-005 | isApproved | Quick Mode承認状態を返す | rejected()で生成したインスタンスの場合 | falseが返ること |
| UT-QMD-006 | equals | 2つのQuickModeDecisionの値等価性を判定する | 同一eligibility/relaxationProfileを持つ場合 | trueが返ること |
| UT-QMD-007 | equals | 2つのQuickModeDecisionの値等価性を判定する | relaxationProfileの有無が異なる場合 | falseが返ること |

#### 不変条件確認

| ケースID | 不変条件 | 入力 | 期待結果 |
|----------|---------|------|---------|
| UT-QMD-008 | INV-D1: eligible=falseのときrelaxationProfile===undefined | rejected()の戻り値 | relaxationProfileがundefinedであること |

---

## 4. ドメインサービステストケース

### 4.1 QuickModeJudgmentEngine（20件）

#### classify()テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JE-001 | classify | 変更ファイル群をカテゴリに分類する | 空配列が渡された場合 | dominantCategory=nullの空のChangeClassificationが返ること |
| UT-JE-002 | classify | 変更ファイル群をカテゴリに分類する | 'docs/'配下のfilePathを持つファイルが渡された場合 | 'docs'カテゴリに分類されること |
| UT-JE-003 | classify | 変更ファイル群をカテゴリに分類する | '__tests__/'配下のfilePathを持つファイルが渡された場合 | 'test'カテゴリに分類されること |
| UT-JE-004 | classify | 変更ファイル群をカテゴリに分類する | '*.config.json'のfilePathを持つファイルが渡された場合 | 'config'カテゴリに分類されること |
| UT-JE-005 | classify | 変更ファイル群をカテゴリに分類する | 'domain/'配下のfilePathを持つファイルが渡された場合 | 'domain'カテゴリに分類されること |
| UT-JE-006 | classify | 変更ファイル群をカテゴリに分類する | '*port.ts'のfilePathを持つファイルが渡された場合 | 'api'カテゴリに分類されること（domain/以下であっても'api'が優先） |
| UT-JE-007 | classify | 変更ファイル群をカテゴリに分類する | domain/以外のCREATEファイルが渡された場合 | 'feature'カテゴリに分類されること |
| UT-JE-008 | classify | 変更ファイル群をカテゴリに分類する | domain/以外のMODIFYファイルが渡された場合 | 'bugfix'カテゴリに分類されること |

#### judge()テスト — 正常系

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JE-009 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | 全ファイルがallowedCategories内（'bugfix'/'docs'/'test'/'config'）のみの場合 | eligible=trueが返ること |
| UT-JE-010 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | 空の変更ファイル一覧が渡された場合 | eligible=trueが返ること |

#### judge()テスト — 3拒否ルール

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JE-011 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | allowedCategories外のファイル（domainカテゴリ）が1件含まれる場合 | eligible=false、rejectionRule='MIXED_CHANGES'が返ること |
| UT-JE-012 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | allowedCategories外のファイル（featureカテゴリ）が含まれる場合 | eligible=false、rejectionRule='MIXED_CHANGES'が返り、rejectedFilesに当該ファイルが含まれること |
| UT-JE-013 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | 'domain/'配下のchangeKind=CREATEファイルが含まれる場合 | eligible=false、rejectionRule='NEW_DOMAIN'が返ること |
| UT-JE-014 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | 'domain/'配下のchangeKind=MODIFYファイルのみが含まれる場合 | NEW_DOMAINルールで拒否されないこと（MIXED_CHANGESで拒否される） |
| UT-JE-015 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | '*port.ts'ファイルの変更が含まれる場合 | eligible=false、rejectionRule='API_CONTRACT'が返ること |
| UT-JE-016 | judge | 変更ファイル群を評価してQuick Mode適用可否を返す | '*adapter.ts'ファイルの変更が含まれる場合 | eligible=false、rejectionRule='API_CONTRACT'が返ること |

#### judge()テスト — 評価順序

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JE-017 | judge | 3拒否ルールをMIXED_CHANGES→NEW_DOMAIN→API_CONTRACTの順で評価する | MIXED_CHANGESとNEW_DOMAINの両条件に該当するファイルが含まれる場合 | 最初に一致するMIXED_CHANGESルールで拒否されること |
| UT-JE-018 | judge | 3拒否ルールをMIXED_CHANGES→NEW_DOMAIN→API_CONTRACTの順で評価する | NEW_DOMAINとAPI_CONTRACTの両条件に該当するファイルが含まれる場合 | NEW_DOMAINルールで拒否されること |

#### judge()テスト — 不変条件

| ケースID | 不変条件 | 入力 | 期待結果 |
|----------|---------|------|---------|
| UT-JE-019 | INV-1: Level間依存はQuick Modeでも緩和しない | 任意の有効なChangedFile[]とQuickModeConfig | 判定結果にLevel間依存緩和の情報が含まれないこと |
| UT-JE-020 | 3拒否ルールはallowedCategoriesで上書きできない | allowedCategoriesに全カテゴリを含む設定で、domainカテゴリのファイルを渡した場合 | MIXED_CHANGESルールで拒否されること |

---

### 4.2 ValidatorRelaxationService（8件）

#### build()テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-VRS-001 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | デフォルト設定と全ValidatorId（L1-001〜L4-005）が渡された場合 | デフォルト緩和プロファイル（L2-001スキップ・L2-002+L2-003維持・L3-001維持・L3-002〜L3-004スキップ）が生成されること |
| UT-VRS-002 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | maintainedLayersにL2-001が含まれる設定が渡された場合 | l2.maintainedにL2-001が含まれること |
| UT-VRS-003 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | relaxedGatesにL2-001のみが含まれる設定が渡された場合 | l2.skippedにL2-001のみが含まれること |
| UT-VRS-004 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | L1の全IDが渡された場合 | l1.all=trueが設定されること（INV-P2保証） |
| UT-VRS-005 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | L4のIDが渡された場合 | l4.all=falseが設定されること（INV-P3保証）、L4はスキップされること |
| UT-VRS-006 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | allValidatorIdsに認識できないID（'X1-999'）が含まれる場合 | 無視されてエラーが発生しないこと |
| UT-VRS-007 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | 生成されたプロファイルのlevelDependencyRelaxedの場合 | 常にfalseであること（INV-P1保証） |
| UT-VRS-008 | build | QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する | 生成されたプロファイルのphaseExecution.twoPhaseRequiredの場合 | 常にfalseであること（INV-P4保証） |

---

## 5. Application層テストケース

### 5.1 JudgeQuickModeEligibilityUseCase（14件）

**モック対象**: ChangedFilesPort、QuickModeConfigPort（QuickModeJudgmentEngineは実体を使用）

#### 正常系

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JUC-001 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | changedFilesを省略した場合 | ChangedFilesPortから変更ファイルを取得してQuickModeEligibilityContractを返すこと |
| UT-JUC-002 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | 明示的なchangedFiles配列が渡された場合 | 渡されたファイルを使用してQuickModeEligibilityContractを返すこと（PortのgetChangedFilesが呼ばれないこと） |
| UT-JUC-003 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | 全ファイルがallowedCategories内のみの場合 | eligible=trueのcontractが返ること |

#### 3拒否ルール別テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JUC-004 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | MIXED_CHANGESルールに該当するファイルが含まれる場合 | eligible=false、rejectionRule='MIXED_CHANGES'のcontractが返ること |
| UT-JUC-005 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | NEW_DOMAINルールに該当するファイルが含まれる場合 | eligible=false、rejectionRule='NEW_DOMAIN'のcontractが返ること |
| UT-JUC-006 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | API_CONTRACTルールに該当するファイルが含まれる場合 | eligible=false、rejectionRule='API_CONTRACT'のcontractが返ること |

#### 異常系

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JUC-007 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | 不明なchangeKindを持つファイルが明示指定された場合 | UnknownChangeCategoryError相当のエラーが発生すること |
| UT-JUC-008 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | QuickModeConfigPortがエラーを返す場合 | PortエラーがUseCaseから伝播すること |
| UT-JUC-009 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | ChangedFilesPortがエラーを返す場合 | PortエラーがUseCaseから伝播すること |

#### 出力形式確認

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-JUC-010 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | eligible=trueの場合 | 返り値のrejectionRuleがundefinedであること |
| UT-JUC-011 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | eligible=trueの場合 | 返り値のrejectedFilesがundefinedであること |
| UT-JUC-012 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | eligible=falseの場合 | 返り値のrejectedFilesに1件以上のファイルが含まれること |
| UT-JUC-013 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | eligible=falseの場合 | 返り値のreasonが空文字でないこと |
| UT-JUC-014 | execute | 変更ファイルの自動取得から適用可否判定まで実行する | 返り値のObject.freeze()が適用されている場合 | contractオブジェクトが凍結されていること |

---

### 5.2 BuildRelaxationProfileUseCase（10件）

**モック対象**: QuickModeConfigPort、ValidatorIdRegistryPort（ValidatorRelaxationServiceは実体を使用）

#### 正常系

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-BUC-001 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | eligible=trueのcontractが渡された場合 | ValidatorRelaxationProfileContractが返ること |
| UT-BUC-002 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | デフォルト設定の場合 | L2-001スキップ・L2-002+L2-003維持・L3-001維持・L3-002〜L3-004スキップのcontractが返ること |
| UT-BUC-003 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | 生成されたcontractのlevelDependencyRelaxedの場合 | falseであること |

#### 異常系

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-BUC-004 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | eligible=falseのcontractが渡された場合 | QuickModeNotEligibleErrorが発生すること |

#### 出力形式確認

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-BUC-005 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | 返り値のl1の場合 | all=trueであること |
| UT-BUC-006 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | 返り値のl4の場合 | all=falseであること |
| UT-BUC-007 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | 返り値のphaseExecutionの場合 | twoPhaseRequired=falseであること |
| UT-BUC-008 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | QuickModeConfigPortがエラーを返す場合 | PortエラーがUseCaseから伝播すること |
| UT-BUC-009 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | ValidatorIdRegistryPortがエラーを返す場合 | PortエラーがUseCaseから伝播すること |
| UT-BUC-010 | execute | eligibility=trueの場合にValidatorRelaxationProfileContractを生成する | 返り値のObject.freeze()が適用されている場合 | contractオブジェクトが再帰的に凍結されていること |

---

### 5.3 ExecuteQuickCiCheckUseCase（10件）

**モック対象**: JudgeQuickModeEligibilityUseCase、BuildRelaxationProfileUseCase（テストダブル使用）

#### eligible=falseのフロー

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-EUC-001 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | eligible=falseの判定結果が返ってきた場合 | relaxationProfile=undefinedのQuickModeDecisionContractが返ること |
| UT-EUC-002 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | eligible=falseの場合 | BuildRelaxationProfileUseCaseが呼ばれないこと |

#### eligible=trueのフロー

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-EUC-003 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | eligible=trueの判定結果が返ってきた場合 | relaxationProfileを含むQuickModeDecisionContractが返ること |
| UT-EUC-004 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | eligible=trueかつdryRun=falseの場合 | `validatorExecutionPort.executeWithProfile(relaxationProfile)`が1回呼ばれること（DIP保証） |
| UT-EUC-005 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | eligible=trueかつdryRun=trueの場合 | `validatorExecutionPort.executeWithProfile`が呼ばれないこと |

#### dryRunフラグ

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-EUC-006 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | dryRun=trueかつeligible=trueの場合 | relaxationProfileが含まれたcontractが返ること（dryRunでもProfileは生成される） |
| UT-EUC-007 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | changedFilesを省略した場合 | JudgeQuickModeEligibilityUseCaseにchangedFiles=undefinedで渡されること |
| UT-EUC-008 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | changedFilesを明示指定した場合 | 指定のchangedFilesがJudgeQuickModeEligibilityUseCaseに渡されること |

#### 異常系

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-EUC-009 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | JudgeQuickModeEligibilityUseCaseがエラーを投げる場合 | UseCaseエラーがExecuteQuickCiCheckUseCaseから伝播すること |
| UT-EUC-010 | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す | BuildRelaxationProfileUseCaseがエラーを投げる場合 | UseCaseエラーがExecuteQuickCiCheckUseCaseから伝播すること |

---

### 5.4 QuickModeDecisionContractMapper（8件）

#### toEligibilityContract()テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-MAP-001 | toEligibilityContract | QuickModeEligibilityをDTOに変換する | eligible=trueのインスタンスが渡された場合 | eligible=true、rejectionRule=undefined、rejectedFiles=undefinedのcontractが返ること |
| UT-MAP-002 | toEligibilityContract | QuickModeEligibilityをDTOに変換する | eligible=falseのインスタンスが渡された場合 | eligible=false、rejectionRuleとrejectedFilesが設定されたcontractが返ること |
| UT-MAP-003 | toEligibilityContract | QuickModeEligibilityをDTOに変換する | rejectedFilesを含むインスタンスが渡された場合 | rejectedFilesが{filePath, changeKind}の配列に変換されること |

#### toRelaxationProfileContract()テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-MAP-004 | toRelaxationProfileContract | ValidatorRelaxationProfileをDTOに変換する | デフォルトプロファイルが渡された場合 | ValidatorRelaxationProfileContractが返ること |
| UT-MAP-005 | toRelaxationProfileContract | ValidatorRelaxationProfileをDTOに変換する | 変換後のlevelDependencyRelaxedの場合 | falseであること |

#### toDecisionContract()テスト

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-MAP-006 | toDecisionContract | QuickModeDecisionを統合DTOに変換する | approved()のインスタンスが渡された場合 | eligibilityとrelaxationProfileの両方が設定されたcontractが返ること |
| UT-MAP-007 | toDecisionContract | QuickModeDecisionを統合DTOに変換する | rejected()のインスタンスが渡された場合 | relaxationProfile=undefinedのcontractが返ること |
| UT-MAP-008 | toDecisionContract | QuickModeDecisionを統合DTOに変換する | 変換後のcontractがObject.freeze()されている場合 | contractが凍結されていること |

---

## 6. 境界値・異常系まとめ

| ケースID | 対象 | 入力 | 期待結果 |
|----------|------|------|---------|
| UT-EDGE-001 | QuickModeConfig | allowedCategoriesが空配列 | QuickModeConfigErrorが発生すること |
| UT-EDGE-002 | QuickModeConfig | allowedCategoriesに'domain'を含む | QuickModeConfigErrorが発生すること（二重防護） |
| UT-EDGE-003 | ChangedFile | filePathが空文字 | エラーが発生すること |
| UT-EDGE-004 | ChangedFile | changeKindが不正値 | エラーが発生すること |
| UT-EDGE-005 | ChangeCategory | 8個目の値（定義外の文字列） | UnknownChangeCategoryErrorが発生すること |
| UT-EDGE-006 | QuickModeEligibility | eligible=false、rejectedFiles=[] | エラーが発生すること（INV-E2） |
| UT-EDGE-007 | QuickModeEligibility | eligible=true/false、reason='' | エラーが発生すること（INV-E3） |
| UT-EDGE-008 | ValidatorRelaxationProfile | l2.maintained∪l2.skipped ≠ {L2-001, L2-002, L2-003} | エラーが発生すること（INV-P5） |
| UT-EDGE-009 | ValidatorRelaxationProfile | l3.maintained∪l3.skipped ≠ {L3-001, L3-002, L3-003, L3-004} | エラーが発生すること（INV-P6） |
| UT-EDGE-010 | QuickModeJudgmentEngine.judge | changedFiles=[] | eligible=trueが返ること |
| UT-EDGE-011 | QuickModeJudgmentEngine.judge | MIXED_CHANGESとNEW_DOMAINが重複する場合 | MIXED_CHANGESが優先されること |
| UT-EDGE-012 | BuildRelaxationProfileUseCase | eligible=falseのcontractを渡す | QuickModeNotEligibleErrorが発生すること |
| UT-EDGE-013 | ValidatorRelaxationService.build | allValidatorIdsに未知のIDが含まれる | 無視してエラーが発生しないこと |
| UT-EDGE-014 | QuickModeDecision.approved | eligible=falseのeligibilityを渡す | エラーが発生すること |
| UT-EDGE-015 | QuickModeJudgmentEngine.judge | domain/配下のCREATEとMODIFYが混在する場合 | CREATEがあればNEW_DOMAIN（MIXED_CHANGESが先に評価されるため実際はMIXED_CHANGES）で拒否されること |
