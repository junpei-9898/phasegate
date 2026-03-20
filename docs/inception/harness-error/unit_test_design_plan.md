# ユニットテスト設計計画: harness-error

> **Unit ID**: harness-error
> **作成日**: 2026-03-13
> **正規ソース**: `docs/product/construction/harness-error/domain_model.md`
> **テスト規約参照**: `docs/principles/testing-rules.md`

---

## 1. スコープ

### 対象Unitのドメインモデル

harness-error Unitは集約を持たない。`HarnessError`を中心とした不変値オブジェクト群と、生成・検証を担うドメインサービス群で構成される。ユニットテストはDomain層の値オブジェクト・ドメインサービスを対象とする。

### テスト対象コンポーネント一覧

| 分類 | コンポーネント | ファイル |
|------|-------------|---------|
| 値オブジェクト | HarnessError | `domain/harness-error.ts` |
| 値オブジェクト | ErrorCode | `domain/value-objects/error-code.ts` |
| 値オブジェクト | Severity | `domain/value-objects/severity.ts` |
| 値オブジェクト | AdrRef | `domain/value-objects/adr-ref.ts` |
| 値オブジェクト | FixExample | `domain/value-objects/fix-example.ts` |
| 値オブジェクト | ErrorDefinition | `domain/value-objects/error-definition.ts` |
| 値オブジェクト | FixExampleValidationResult | `domain/value-objects/fix-example-validation-result.ts` |
| ドメインサービス | HarnessErrorFactory | `domain/services/harness-error-factory.ts` |
| ドメインサービス | ErrorDefinitionRegistry | `domain/services/error-definition-registry.ts` |
| ドメインサービス | SeverityContractEnforcer | `domain/services/severity-contract-enforcer.ts` |

---

## 2. テスト対象分析

### 集約

集約なし。`domain_model.md` §2の結論により、HarnessErrorは不変値オブジェクトとして設計されている。

### エンティティ

エンティティなし。全概念が値オブジェクトまたはドメインサービスとして分類されている。

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| HarnessError | 3（不変性、値等価性、Object.freeze適用） | 8 |
| ErrorCode | 2（正規表現`^L[0-4]-[0-9]{3,}$`一致、意味名コード拒否） | 12 |
| Severity | 3（error/warning限定、rank比較、Object.freeze適用） | 8 |
| AdrRef | 2（ADR-{nnn}形式、3桁固定） | 6 |
| FixExample | 2（空文字不可、trim後検証） | 5 |
| ErrorDefinition | 3（defaultAdrRef保持時のadrRefRequired=false拒否、fixExampleRequired時のdefault/explicit必須、defaultSeverity=warningからerrorへの格上げ許容） | 14 |
| FixExampleValidationResult | 2（passed=true時reason=null、passed=false時diagnostics>=1） | 7 |

### ドメインサービス

| サービス名 | メソッド数 | テストケース概算 |
|-----------|----------|---------------|
| HarnessErrorFactory | 1（create） | 18 |
| ErrorDefinitionRegistry | 5（getDefinition, getAllDefinitions, listByValidator, listByLayer, hasDefinition）※ `domain_model.md`に3メソッド、`logical_design.md` §2.3.2に追加2メソッド（listByValidator, listByLayer）を定義 | 14 |
| SeverityContractEnforcer | 2（resolveEffectiveSeverity, assertNoDowngrade） | 10 |

**合計テストケース概算: 約102件**

---

## 3. テスト方針

### 正常系/異常系のバランス

- 値オブジェクトの生成テスト: 正常系1〜2件 + 異常系2〜4件（形式違反、境界値、空入力）
- ドメインサービスのテスト: 正常系2〜3件 + 異常系はドメインエラーの種類ごとに1件以上
- HarnessErrorFactoryは不変条件INV-1〜INV-8を網羅的に検証する

### 境界値テストの対象

| 対象 | 境界値 |
|------|-------|
| ErrorCode.layer | L0（最小）、L4（最大）、L5（範囲外） |
| ErrorCode.sequence | 000（最小3桁）、999（最大3桁）、0000（4桁） |
| AdrRef | ADR-000（最小）、ADR-999（最大）、ADR-0000（4桁=形式外） |
| FixExample.value | 空文字、空白のみ、1文字（最小有効値） |
| Severity | error（rank=2）、warning（rank=1）、info（範囲外） |

### テスト規約の適用

- **ドメイン実体のモック禁止**: 値オブジェクト・ドメインサービスはすべて実体を使用する
- **Portのみモック使用可**: HarnessErrorFactoryテストでは`FixExampleValidatorPort`と`AdrExistenceCheckerPort`のみテストダブルを使用する
- **AAAパターン**: 全テストケースで`// Arrange` / `// Act` / `// Assert`コメントを明示する
- **テストケース名は日本語**: 仕様としての表現力を持つ日本語で記述する
- **describe/it構造**: `target` / `describe` / `context` / `it`パターンを使用する
- **Act結果は`actual`変数**: テスト実行結果は`actual`に代入する
- **ファイル名はkebab-case**: `error-code.test.ts`、`harness-error-factory.test.ts`等

### テストケース名の設計方針

値オブジェクトの生成テストでは、ファクトリメソッド（`create`）を`target`とし、正常系は`describe`で振る舞いを、異常系は`context`で前提条件を記述する。

```
target('create', () => {
  describe('有効なエラーコード文字列からErrorCodeを生成する', () => {
    it('layerとsequenceが正しく分離されること', ...);
  });
  context('L5で始まる文字列が渡された場合', () => {
    it('InvalidErrorCodeErrorをthrowすること', ...);
  });
});
```

---

## 4. テスト対象の詳細

### 4.1 ErrorCode

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | `L0-001`形式の文字列からErrorCodeが生成される | 正常系 |
| 2 | `L4-999`形式の文字列からErrorCodeが生成される | 正常系（境界） |
| 3 | `L0-0001`（4桁連番）の文字列からErrorCodeが生成される | 正常系（拡張性確認） |
| 4 | `getLayer()`がレイヤー識別子を返す | 正常系 |
| 5 | `toString()`が元の文字列表現を返す | 正常系 |
| 6 | 同一値のErrorCode同士の`equals()`がtrueを返す | 正常系 |
| 7 | 異なる値のErrorCode同士の`equals()`がfalseを返す | 正常系 |
| 8 | 空文字が渡された場合、InvalidErrorCodeErrorをthrowする | 異常系 |
| 9 | `L5-001`が渡された場合、InvalidErrorCodeErrorをthrowする | 異常系（境界） |
| 10 | `L2-PHASE-GATE`形式が渡された場合、InvalidErrorCodeErrorをthrowする | 異常系（意味名拒否） |
| 11 | `L2-01`（2桁連番）が渡された場合、InvalidErrorCodeErrorをthrowする | 異常系（桁数不足） |
| 12 | 正規表現に一致しない任意文字列でInvalidErrorCodeErrorをthrowする | 異常系 |

### 4.2 Severity

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | `"error"`からSeverityが生成される | 正常系 |
| 2 | `"warning"`からSeverityが生成される | 正常系 |
| 3 | errorのrankがwarningより高い（`isHigherThan`がtrue） | 正常系 |
| 4 | warningのrankがerrorより低い（`isHigherThan`がfalse） | 正常系 |
| 5 | 同一severity同士の`equals()`がtrueを返す | 正常系 |
| 6 | 生成後のオブジェクトがObject.freezeで凍結されている | 正常系（不変性） |
| 7 | `"info"`が渡された場合、入力不正として拒否される | 異常系 |
| 8 | 空文字が渡された場合、入力不正として拒否される | 異常系 |

### 4.3 AdrRef

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | `ADR-001`形式の文字列からAdrRefが生成される | 正常系 |
| 2 | `toString()`が元の文字列を返す | 正常系 |
| 3 | 同一値の`equals()`がtrueを返す | 正常系 |
| 4 | `ADR-0001`（4桁）が渡された場合、エラーをthrowする | 異常系（境界） |
| 5 | `ADR-`（連番なし）が渡された場合、エラーをthrowする | 異常系 |
| 6 | 形式に一致しない文字列でエラーをthrowする | 異常系 |

### 4.4 FixExample

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 有効なコード片文字列からFixExampleが生成される | 正常系 |
| 2 | `toString()`が元の文字列を返す | 正常系 |
| 3 | 同一値の`equals()`がtrueを返す | 正常系 |
| 4 | 空文字が渡された場合、エラーをthrowする | 異常系 |
| 5 | 空白のみの文字列が渡された場合、trim後に空文字としてエラーをthrowする | 異常系 |

### 4.5 ErrorDefinition

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 全属性を指定してErrorDefinitionが生成される | 正常系 |
| 2 | `requiresAdrRef()`がadrRefRequired=trueの場合にtrueを返す | 正常系 |
| 3 | `requiresFixExample()`がfixExampleRequired=trueの場合にtrueを返す | 正常系 |
| 4 | `resolveAdrRef()`にexplicit AdrRefが渡された場合、それを返す | 正常系 |
| 5 | `resolveAdrRef()`にexplicitが未指定でdefaultAdrRefがある場合、defaultを返す | 正常系 |
| 6 | `resolveAdrRef()`にexplicitもdefaultもない場合、nullを返す | 正常系 |
| 7 | `resolveFixExample()`にexplicit FixExampleが渡された場合、それを返す | 正常系 |
| 8 | `resolveFixExample()`にexplicitが未指定でdefaultFixExampleがある場合、defaultを返す | 正常系 |
| 9 | `resolveFixExample()`にexplicitもdefaultもない場合、nullを返す | 正常系 |
| 10 | 同一属性のErrorDefinition同士の`equals()`がtrueを返す | 正常系 |
| 11 | defaultAdrRefを持つ場合にadrRefRequired=falseは不正として拒否される | 異常系 |
| 12 | defaultSeverity=warningの定義に対してerrorへの格上げは許容される | 正常系（契約確認） |
| 13 | fixExampleRequired=trueでdefaultFixExampleもexplicitもない場合の挙動確認 | 異常系（境界） |
| 14 | ownerValidatorIdが空文字の場合の挙動確認 | 異常系 |

### 4.6 FixExampleValidationResult

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | `success()`ファクトリでpassedがtrue、reasonがnullの結果が生成される | 正常系 |
| 2 | `failure()`ファクトリでpassedがfalse、reasonとdiagnosticsが設定される | 正常系 |
| 3 | `failure()`でdiagnosticsが1件以上ある | 正常系 |
| 4 | 同一属性の結果同士の`equals()`がtrueを返す | 正常系 |
| 5 | success時にdiagnosticsが空配列である | 正常系 |
| 6 | failure時にreasonが必須である | 異常系 |
| 7 | failure時にdiagnosticsが空の場合の挙動確認 | 異常系（境界） |

### 4.7 HarnessError（中心モデル）

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 全必須属性を持つHarnessErrorの値等価性が正しく判定される | 正常系 |
| 2 | adrRefを持つHarnessErrorの`hasAdrRef()`がtrueを返す | 正常系 |
| 3 | adrRefを持たないHarnessErrorの`hasAdrRef()`がfalseを返す | 正常系 |
| 4 | fixExampleを持つHarnessErrorの`hasFixExample()`がtrueを返す | 正常系 |
| 5 | fixExampleを持たないHarnessErrorの`hasFixExample()`がfalseを返す | 正常系 |
| 6 | `toContract()`がShared Kernel公開DTOを返す | 正常系 |
| 7 | `toContract()`の戻り値がObject.freezeで凍結されている | 正常系（不変性） |
| 8 | 全フィールドが一致する場合にequalsがtrueを返す | 正常系 |

### 4.8 HarnessErrorFactory

| # | テスト観点 | 種別 | 対応不変条件 |
|---|----------|------|------------|
| 1 | 全条件を満たすパラメータからHarnessErrorが生成される | 正常系 | INV-1〜8 |
| 2 | requestedSeverity未指定時にdefaultSeverityが適用される | 正常系 | INV-3 |
| 3 | warningからerrorへの格上げが許容される | 正常系 | INV-3 |
| 4 | adrRef省略時にdefaultAdrRefが使用される | 正常系 | INV-5 |
| 5 | fixExample省略時にdefaultFixExampleが使用される | 正常系 | INV-7 |
| 6 | 生成されたHarnessErrorがObject.freezeで凍結されている | 正常系 | INV-8 |
| 7 | 未登録のErrorCodeでUnknownErrorDefinitionErrorをthrowする | 異常系 | INV-2 |
| 8 | errorからwarningへの格下げでSeverityDowngradeViolationErrorをthrowする | 異常系 | INV-3 |
| 9 | adrRefRequired=trueでadr_ref未指定時にMissingAdrRefErrorをthrowする | 異常系 | INV-5 |
| 10 | ADR実在性検証失敗時にAdrReferenceNotFoundErrorをthrowする | 異常系 | INV-4 |
| 11 | fixExampleRequired=trueでfix_example未指定時にMissingFixExampleErrorをthrowする | 異常系 | INV-7 |
| 12 | fix_example構文検証失敗時にInvalidFixExampleErrorをthrowする | 異常系 | INV-6 |
| 13 | messageが空文字の場合にEmptyMessageErrorをthrowする | 異常系 | - |
| 14 | suggestionが空文字の場合にEmptySuggestionErrorをthrowする | 異常系 | - |
| 15 | adr_refがADR-{nnn}形式に準拠しない場合にエラーをthrowする | 異常系 | INV-4 |
| 16 | FixExampleValidatorPortが失敗を返した場合にInvalidFixExampleErrorをthrowする | 異常系 | INV-6 |
| 17 | AdrExistenceCheckerPortがfalseを返した場合にAdrReferenceNotFoundErrorをthrowする | 異常系 | INV-4 |
| 18 | ErrorCodeがL{n}-{nnn}形式に準拠しない場合にInvalidErrorCodeErrorをthrowする | 異常系 | INV-1 |

### 4.9 ErrorDefinitionRegistry

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 登録済みコードに対して`getDefinition()`が定義を返す | 正常系 |
| 2 | 未登録コードに対して`getDefinition()`がUnknownErrorDefinitionErrorをthrowする | 異常系 |
| 3 | `getAllDefinitions()`がcode昇順で全定義を返す | 正常系 |
| 4 | `getAllDefinitions()`の戻り値がreadonly配列である | 正常系 |
| 5 | `listByValidator()`が指定validatorIdの定義のみを返す | 正常系 |
| 6 | `listByValidator()`が該当なしの場合に空配列を返す | 正常系 |
| 7 | `listByLayer()`が指定layerの定義のみを返す | 正常系 |
| 8 | `listByLayer()`が該当なしの場合に空配列を返す | 正常系 |
| 9 | `hasDefinition()`が登録済みコードに対してtrueを返す | 正常系 |
| 10 | `hasDefinition()`が未登録コードに対してfalseを返す | 正常系 |
| 11 | コンストラクタに重複codeの定義が渡された場合にエラーをthrowする | 異常系 |
| 12 | `listByValidator()`の戻り値がcode昇順である | 正常系 |
| 13 | `listByLayer()`の戻り値がcode昇順である | 正常系 |
| 14 | 空の定義配列でレジストリが構築可能である | 正常系（境界） |

### 4.10 SeverityContractEnforcer

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | requested未指定時にdefaultSeverityを返す | 正常系 |
| 2 | requestedがdefaultと同一の場合にrequestedを返す | 正常系 |
| 3 | warning→errorの格上げが許容されerrorを返す | 正常系 |
| 4 | error→warningの格下げでSeverityDowngradeViolationErrorをthrowする | 異常系 |
| 5 | `assertNoDowngrade()`が格下げ時にSeverityDowngradeViolationErrorをthrowする | 異常系 |
| 6 | `assertNoDowngrade()`が格上げ時に例外をthrowしない | 正常系 |
| 7 | `assertNoDowngrade()`が同一severity時に例外をthrowしない | 正常系 |
| 8 | defaultSeverity=error、requested=errorの場合にerrorを返す | 正常系（境界） |
| 9 | defaultSeverity=warning、requested=warningの場合にwarningを返す | 正常系（境界） |
| 10 | defaultSeverity=error、requested=warningの場合にSeverityDowngradeViolationErrorをthrowする | 異常系 |

---

## 4. QA（不明点・確認事項）

| # | 質問 | 影響 |
|---|------|------|
| Q1 | HarnessErrorFactoryの`create`メソッドは`Promise<HarnessError>`を返すが、UT内でPort（AdrExistenceCheckerPort、FixExampleValidatorPort）のテストダブルは同期的に即時解決するモックでよいか | テストダブル設計 |

[Answer] 採用する。UT内ではPortのテストダブルを同期的に即時解決する（`Promise.resolve()`）モックとする。非同期の振る舞いテストはIT層で実施する。

| Q2 | ErrorDefinitionRegistryのコンストラクタで重複code検出時のエラー型は`HarnessErrorDomainError`か | 異常系テストの期待値 |

[Answer] 採用する。重複code検出時はドメイン固有の`DuplicateErrorCodeError`（`HarnessErrorDomainError`のサブクラス）をthrowする。テストではこのエラー型を期待値とする。

| Q3 | ErrorDefinition生成時の`defaultAdrRef`と`adrRefRequired=false`の組み合わせ不正は、ErrorDefinition自身の生成時にthrowするのか、Registry登録時にthrowするのか | テストの配置 |

[Answer] ErrorDefinition自身の生成時（ファクトリまたはコンストラクタ）にthrowする。不変条件はオブジェクト生成時に検証するDDD原則に従う。テストはErrorDefinitionのテストファイルに配置する。

---

## 5. 前提条件・リスク

### 前提条件

- テストフレームワークはVitest 3.0.0を使用する
- `target`/`context`ヘルパーが`describe`のエイリアスとして提供されている
- ドメインエラークラス（`InvalidErrorCodeError`、`UnknownErrorDefinitionError`等）が`domain/errors/`配下に定義されている

### リスク

| # | リスク | 影響度 | 軽減策 |
|---|-------|-------|-------|
| R1 | HarnessErrorFactoryの依存Port数が2つあり、テストダブルの組み合わせが複雑になる | 中 | Port別にテストケースを分離し、他方は常時成功を返すダブルを使用する |
| R2 | ErrorDefinitionの属性数が多く（9属性）、テストデータのセットアップが冗長になる | 低 | テストヘルパーまたはオブジェクトマザーパターンでデフォルト値付きファクトリを用意する |
| R3 | `domain_model.md` OQ-2（fix_example構文検証パーサー範囲）が論理設計で「TypeScript Compiler API」に決定されたが、Domain層UTではPortのテストダブルを使うため直接影響しない | 低 | Portのテストダブルで`FixExampleValidationResult`を返すのみとする |
