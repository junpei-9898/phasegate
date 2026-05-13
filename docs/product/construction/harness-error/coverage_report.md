# テストカバレッジレポート: harness-error

@story-id H06-01
@story-id H06-02
@story-id H06-03
> 判定基準: `✅` = 完全カバー、`⚠️` = 一部カバー、`❌` = 未カバー
> 集計ルール: サマリーの「カバー項目数」は `✅` のみを計上し、`⚠️` と `❌` は未カバー項目数に含める。
> AC ID欄は、`docs/product/units/harness_error_unit.md` の機能要件節番号と箇条書き番号を参照IDとして用いる。

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 13 | 0 | 100% |
| ドメインロジック | 23 | 0 | 100% |
| UseCase | 6 | 0 | 100% |
| **総合** | 42 | 0 | 100% |

### 判定結果
- ✅ 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要

**今回の判定**: `✅ 100%`。前回レポート（83%）で指摘された全未カバー項目に対応するテストケースが追加された。受け入れ基準・ドメインロジック・UseCase全観点で完全カバーを達成している。

### 前回（83%）からの改善内訳

| 改善項目 | 追加されたテストケース | 影響観点 |
|---------|---------------------|---------|
| FixExampleValidationResult同時保持のVO単体テスト | UT-HE-112 | ドメインロジック |
| ListErrorDefinitionsUseCase異常系 | IT-HE-137, IT-HE-138, IT-HE-139 | UseCase |
| AssertSeverityContractHandler ADR参照出力検証 | IT-HE-140, IT-HE-141 | 受け入れ基準（§3.3-4） |
| L1-L4全バリデータ横断回帰テスト | IT-HE-142, IT-HE-143 | 受け入れ基準（§3.1-2） |
| 全定義adrRef付与保証回帰テスト | IT-HE-144 | 受け入れ基準（§3.1-3） |
| 全定義fixExample付与保証回帰テスト | IT-HE-145 | 受け入れ基準（§3.1-4） |
| fix_example更新時CI自動起動契約テスト | IT-HE-146 | 受け入れ基準（§3.2-4） |

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| §3.1-1 | HarnessError型を`{code, severity, message, suggestion, adr_ref, fix_example}`で定義 | UT-HE-053-060, UT-HE-103-111, IT-HE-001-006, IT-HE-125-136 | ✅ |
| §3.1-2 | L1-L4全バリデータのエラー出力をHarnessErrorフォーマットに統一 | IT-HE-009-018, IT-HE-075-082, IT-HE-083-087, IT-HE-142, IT-HE-143 | ✅ |
| §3.1-3 | 全バリデータのHarnessErrorに`adr_ref`を付与 | UT-HE-064, UT-HE-069-070, UT-HE-075, UT-HE-077, IT-HE-005, IT-HE-115, IT-HE-144 | ✅ |
| §3.1-4 | 全バリデータのHarnessErrorに`fix_example`を付与 | UT-HE-065, UT-HE-071-072, UT-HE-076, IT-HE-006, IT-HE-019-034, IT-HE-118, IT-HE-145 | ✅ |
| §3.1-5 | HarnessErrorフォーマット準拠を検証する自動テスト | UT-HE-058-059, UT-HE-103-111, IT-HE-095-096, IT-HE-125-132 | ✅ |
| §3.2-1 | 全バリデータのfix_exampleをテスト資産として管理 | IT-HE-019-034, IT-HE-063-070 | ✅ |
| §3.2-2 | CIパイプラインでfix_exampleの妥当性を検証 | IT-HE-063, IT-HE-066, IT-HE-097-102 | ✅ |
| §3.2-3 | fix_exampleが構文的に不正な場合、CIが失敗 | IT-HE-060-061, IT-HE-064, IT-HE-100, IT-HE-102 | ✅ |
| §3.2-4 | fix_example更新時にバリデーションが自動実行 | IT-HE-146 | ✅ |
| §3.3-1 | severity権限契約（`error`の格下げ禁止）を仕様として定義 | UT-HE-093-102, IT-HE-035-040, IT-HE-108-112 | ✅ |
| §3.3-2 | Harness APIレスポンスでseverityが`readonly`であることを型レベルで保証 | UT-HE-059, UT-HE-111, IT-HE-004, IT-HE-050, IT-HE-132 | ✅ |
| §3.3-3 | severity格下げを試みるケースを検出するテスト | UT-HE-068, UT-HE-096-102, IT-HE-038, IT-HE-109 | ✅ |
| §3.3-4 | 契約違反時のエラーメッセージに違反内容と根拠（ADR参照）を含める | IT-HE-109, IT-HE-140, IT-HE-141 | ✅ |

## 3. ドメインロジックカバレッジ詳細

### 集約

| 集約名 | 不変条件 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| 該当なし | `domain_model.md`で「集約なし」と定義。HarnessErrorは不変値オブジェクトとして扱う | - | 対象外 |

### エンティティ

| エンティティ名 | ビジネスルール | 対応テストケース | カバー状態 |
|------|---------------|----------------|----------|
| 該当なし | 本Unitはエンティティを持たず、値オブジェクトとドメインサービス中心で構成される | - | 対象外 |

### 値オブジェクト

| 値オブジェクト名 | 制約 | 対応テストケース | カバー状態 |
|------|------|----------------|----------|
| ErrorCode | `^L[0-4]-[0-9]{3,}$`形式に準拠する | UT-HE-001-003, UT-HE-008-012, UT-HE-078 | ✅ |
| ErrorCode | 意味名コード（`L2-PHASE-GATE`等）を拒否する | UT-HE-010 | ✅ |
| Severity | `"error"` / `"warning"`のみ許容する | UT-HE-013-020 | ✅ |
| Severity | rank比較で格上げ/同値/格下げ判定を行う | UT-HE-015-016, UT-HE-095-101 | ✅ |
| Severity | 生成後は不変である | UT-HE-018 | ✅ |
| AdrRef | `ADR-{nnn}`形式に準拠する | UT-HE-021-026, UT-HE-075 | ✅ |
| FixExample | trim後に空文字を許容しない | UT-HE-027-031 | ✅ |
| FixExampleValidationResult | `passed=true`時は`reason=null` | UT-HE-032, UT-HE-036 | ✅ |
| FixExampleValidationResult | `passed=false`時は`diagnostics.length >= 1` | UT-HE-033-038 | ✅ |
| FixExampleValidationResult | 構文エラーとvalidator再実行失敗を同時に保持する | UT-HE-112, IT-HE-067 | ✅ |
| ErrorDefinition | `defaultAdrRef`を持つ場合は`adrRefRequired=true`でなければならない | UT-HE-049 | ✅ |
| ErrorDefinition | `fixExampleRequired=true`時はdefaultまたはexplicit fix_exampleが必要 | UT-HE-045-047, UT-HE-051 | ✅ |
| ErrorDefinition | `warning -> error`の格上げを許容する | UT-HE-050, UT-HE-063, UT-HE-095 | ✅ |
| ErrorDefinition | `ownerValidatorId`が空文字であってはならない | UT-HE-052 | ✅ |
| HarnessError | 値等価性で比較される | UT-HE-053, UT-HE-060 | ✅ |
| HarnessError | `adrRef` / `fixExample`の保持有無を正しく返す | UT-HE-054-057 | ✅ |
| HarnessError | Shared Kernel DTOへ正しく投影される | UT-HE-058, IT-HE-047-049, IT-HE-110, IT-HE-131 | ✅ |
| HarnessError | 生成後と公開DTOが不変である | UT-HE-059, UT-HE-066, IT-HE-050, IT-HE-132 | ✅ |

### ドメインサービス

| サービス名 | ビジネスルール | 対応テストケース | カバー状態 |
|------|---------------|----------------|----------|
| HarnessErrorFactory | 未登録ErrorCodeは拒否される | UT-HE-067 | ✅ |
| HarnessErrorFactory | severity格下げは禁止される | UT-HE-068 | ✅ |
| HarnessErrorFactory | ADR必須・存在確認・形式検証を行う | UT-HE-069-070, UT-HE-075, UT-HE-077 | ✅ |
| HarnessErrorFactory | fix_example必須・構文検証・validator失敗検知を行う | UT-HE-071-072, UT-HE-076 | ✅ |
| HarnessErrorFactory | `message` / `suggestion`空文字を拒否する | UT-HE-073-074 | ✅ |
| ErrorDefinitionRegistry | 重複codeを拒否する | UT-HE-089 | ✅ |
| ErrorDefinitionRegistry | code昇順・readonly・filteringを保証する | UT-HE-079-088, UT-HE-090-092 | ✅ |
| SeverityContractEnforcer | effective severityを解決し、格下げを禁止する | UT-HE-093-102, IT-HE-035-040 | ✅ |

## 4. UseCaseカバレッジ詳細

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|---------|------|------|----------|
| CreateHarnessErrorUseCase | IT-HE-001-006 | IT-HE-007-008 | ✅ |
| NormalizeValidatorErrorsUseCase | IT-HE-009-015, IT-HE-018 | IT-HE-016-017 | ✅ |
| ValidateFixExampleUseCase | IT-HE-019-023 | IT-HE-024-026 | ✅ |
| ValidateAllFixExamplesUseCase | IT-HE-027-033 | IT-HE-034 | ✅ |
| AssertSeverityContractUseCase | IT-HE-035-037 | IT-HE-038-040 | ✅ |
| ListErrorDefinitionsUseCase | IT-HE-041-046 | IT-HE-137, IT-HE-138, IT-HE-139 | ✅ |

## 5. 未カバー項目一覧

全項目がカバーされており、未カバー項目はない。

## 6. 前回レポートからの改善詳細

### 受け入れ基準（62% -> 100%）

| 前回状態 | AC ID | 改善内容 |
|---------|------|---------|
| ⚠️ | §3.1-2 | IT-HE-142（全ErrorDefinition走査で各レイヤー代表validatorの出力がHarnessErrorContract構造に正規化される回帰テスト）およびIT-HE-143（全ErrorDefinitionのコードがL{n}-{nnn}形式に準拠する回帰テスト）の追加により、最小fixtureから全定義横断の回帰保証へ引き上げられた |
| ⚠️ | §3.1-3 | IT-HE-144（全ErrorDefinition走査でadrRefRequired=trueの定義にdefaultAdrRefが必ず存在する回帰テスト）の追加により、全validator定義のadr_ref付与を一括検証可能になった |
| ⚠️ | §3.1-4 | IT-HE-145（全ErrorDefinition走査でfixExampleRequired=trueの定義にdefaultFixExampleが必ず存在する回帰テスト）の追加により、全validator定義のfix_example付与を一括検証可能になった |
| ❌ | §3.2-4 | IT-HE-146（fix_example関連ファイル変更時にValidateAllFixExamplesUseCase相当のジョブがトリガーされる契約テスト）の追加により、CI自動起動の検証が可能になった |
| ⚠️ | §3.3-4 | IT-HE-140（格下げ違反時にcode・違反内容・ADR-xxx参照が全て含まれる検証）およびIT-HE-141（ADR参照がErrorDefinitionのdefaultAdrRefと一致する検証）の追加により、違反出力のADR参照まで検証されるようになった |

### ドメインロジック（96% -> 100%）

| 前回状態 | 対象 | 改善内容 |
|---------|------|---------|
| ⚠️ | FixExampleValidationResult同時保持 | UT-HE-112（構文エラーとvalidator再実行失敗を同時に保持するVO単体テスト）の追加により、Adapter経由の間接検証からVO単体での直接検証に引き上げられた |

### UseCase（83% -> 100%）

| 前回状態 | 対象 | 改善内容 |
|---------|------|---------|
| ⚠️ | ListErrorDefinitionsUseCase異常系 | IT-HE-137（ErrorDefinitionRegistry取得失敗時の例外伝播）、IT-HE-138（ContractMapper由来の想定外例外の伝播）、IT-HE-139（不正なlayerフィルタ値のバリデーションエラー）の追加により、正常系+異常系の両面がカバーされた |

## 7. 次のアクション

全観点で100%カバレッジを達成したため、テストロジック設計（実装）フェーズに進んで問題ない。

1. ユニットテスト設計（112ケース）とITテスト設計（146ケース）の合計258ケースを実装する。
2. 回帰テスト（IT-HE-142〜146）は`buildErrorDefinitionRegistry`で構築した実レジストリを使用するため、ErrorDefinition静的定義（`infrastructure/registry/l1〜l4-error-definitions.ts`）の完成後に実装する。
3. CI契約テスト（IT-HE-146）はGitHub Actions workflow定義の完成後に実装する。

## WI-155: Error Contract Traceability Reflection

@work-item-id WI-155

HarnessError coverage uses Work Item IDs for new product reflection and preserves legacy story IDs only as historical mapping evidence. Recovery metadata fields such as `suggested_skill`, `scaffold_command`, and validator IDs are validated as payload contract fields, not as substitutes for `@work-item-id` annotations in product docs.
